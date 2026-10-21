const { pool } = require('../config/db');
const { nanoid } = require('nanoid');
const { ejecutarTriaje } = require('../services/aiClient');
const { calcularPriorityScore } = require('../utils/priority');
const { SLA_HORAS, CATEGORIAS, SEVERIDADES, SENTIMIENTOS, ESTADOS } = require('../utils/constants');
const { buscarAnalistaIdoneo } = require('../services/routingService');

// --- Crear ticket + ejecutar triaje automático (RF02-RF06) ---
exports.crearTicket = async (req, res) => {
  const { asunto, descripcion } = req.body;

  if (!asunto || !descripcion) {
    return res.status(400).json({ error: 'asunto y descripcion son obligatorios.' });
  }

  const clienteId = req.usuario.id;
  const codigo = `TKT-${nanoid(6).toUpperCase()}`;

  // Ejecutar triaje
  const triaje = await ejecutarTriaje({ asunto, descripcion });
  const { resultado, proveedor, textoAnonimizado, latenciaMs } = triaje;

  const priorityScore = calcularPriorityScore({
    severidad: resultado.severidad,
    scoreFrustracion: resultado.score_frustracion,
  });

  const slaHoras = SLA_HORAS[resultado.severidad] || 24;

  // Guardar ticket
  const [ins] = await pool.query(
    `INSERT INTO tickets
       (codigo, cliente_id, asunto, descripcion_original, descripcion_anonimizada,
        categoria, severidad, sentimiento, score_frustracion, priority_score,
        proveedor_ia, sla_horas, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo')`,
    [
      codigo, clienteId, asunto, descripcion, textoAnonimizado,
      resultado.categoria, resultado.severidad, resultado.sentimiento,
      resultado.score_frustracion, priorityScore, proveedor, slaHoras,
    ]
  );

  // Log de auditoría del triaje
  await pool.query(
    `INSERT INTO triage_logs (ticket_id, proveedor, texto_enviado, respuesta_ia, latencia_ms, exito)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [ins.insertId, proveedor, textoAnonimizado, triaje.respuestaBruta || null, latenciaMs]
  );

  // Enrutamiento inteligente
  const analista = await buscarAnalistaIdoneo(resultado.categoria);
  if (analista) {
    await pool.query(
      `UPDATE tickets SET analista_id = ?, estado = 'asignado', motivo_reasignacion = 'Asignación automática por triaje PLN' WHERE id = ?`,
      [analista.id, ins.insertId]
    );
  }

  // Auditoría
  await pool.query(
    `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'crear_ticket', ?)`,
    [clienteId, `Ticket ${codigo} creado y analizado con ${proveedor} en ${latenciaMs}ms`]
  );

  return res.status(201).json({
    mensaje: 'Ticket creado y analizado con éxito.',
    ticket: {
      id: ins.insertId,
      codigo,
      categoria: resultado.categoria,
      severidad: resultado.severidad,
      sentimiento: resultado.sentimiento,
      score_frustracion: resultado.score_frustracion,
      resumen_ejecutivo: resultado.resumen_ejecutivo,
      priority_score: priorityScore,
      sla_horas: slaHoras,
      proveedor_ia: proveedor,
      latencia_ms: latenciaMs,
      analista_asignado: analista
        ? { id: analista.id, nombre: analista.nombre, email: analista.email }
        : null,
    },
  });
};

// --- Listar tickets (filtro por rol) ---
exports.listarTickets = async (req, res) => {
  const { estado, severidad, categoria, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit) || 20, 100);
  const tam = Math.min(Number(limit) || 20, 100);

  const where = [];
  const params = [];

  // Filtro por rol: clientes solo ven sus tickets
  if (req.usuario.rol === 'cliente') {
    where.push('t.cliente_id = ?');
    params.push(req.usuario.id);
  } else if (req.usuario.rol === 'analista') {
    // Analistas ven tickets asignados a ellos
    where.push('t.analista_id = ?');
    params.push(req.usuario.id);
  }
  // Administradores ven todos

  if (estado && ESTADOS.includes(estado)) { where.push('t.estado = ?'); params.push(estado); }
  if (severidad && SEVERIDADES.includes(severidad)) { where.push('t.severidad = ?'); params.push(severidad); }
  if (categoria && CATEGORIAS.includes(categoria)) { where.push('t.categoria = ?'); params.push(categoria); }

  const condicion = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [filas] = await pool.query(
    `SELECT t.*, u.nombre AS cliente_nombre, a.nombre AS analista_nombre
       FROM tickets t
       LEFT JOIN usuarios u ON u.id = t.cliente_id
       LEFT JOIN usuarios a ON a.id = t.analista_id
       ${condicion}
      ORDER BY t.priority_score DESC, t.creado_el DESC
      LIMIT ? OFFSET ?`,
    [...params, tam, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM tickets t ${condicion}`,
    params
  );

  return res.json({
    tickets: filas,
    paginacion: {
      page: Number(page),
      limit: tam,
      total,
      totalPaginas: Math.ceil(total / tam),
    },
  });
};

// --- Obtener ticket por ID ---
exports.obtenerTicket = async (req, res) => {
  const { id } = req.params;

  const [filas] = await pool.query(
    `SELECT t.*, u.nombre AS cliente_nombre, a.nombre AS analista_nombre
       FROM tickets t
       LEFT JOIN usuarios u ON u.id = t.cliente_id
       LEFT JOIN usuarios a ON a.id = t.analista_id
      WHERE t.id = ? LIMIT 1`,
    [id]
  );

  if (filas.length === 0) {
    return res.status(404).json({ error: 'Ticket no encontrado.' });
  }

  const ticket = filas[0];

  // Los clientes solo pueden ver sus propios tickets
  if (req.usuario.rol === 'cliente' && ticket.cliente_id !== req.usuario.id) {
    return res.status(403).json({ error: 'Prohibido: no tienes acceso a este ticket.' });
  }

  return res.json({ ticket });
};

// --- Actualizar estado de ticket ---
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, motivo } = req.body;

  if (!estado || !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `estado inválido. Valores: ${ESTADOS.join(', ')}` });
  }

  const [existe] = await pool.query('SELECT id, estado FROM tickets WHERE id = ?', [id]);
  if (existe.length === 0) {
    return res.status(404).json({ error: 'Ticket no encontrado.' });
  }

  const campos = { estado };
  if (estado === 'resuelto') campos.resuelto_el = new Date();
  if (estado === 'cerrado') campos.cerrado_el = new Date();
  if (motivo) campos.motivo_reasignacion = motivo;

  await pool.query('UPDATE tickets SET ? WHERE id = ?', [campos, id]);

  // Registrar primera respuesta (FRT) si corresponde, la primera vez
  if (estado === 'en_proceso' || estado === 'resuelto') {
    await pool.query(
      `UPDATE tickets SET primer_respuesta_el = NOW()
        WHERE id = ? AND primer_respuesta_el IS NULL`,
      [id]
    );
  }

  await pool.query(
    `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'actualizar_estado', ?)`,
    [req.usuario.id, `Ticket #${id} de ${existe[0].estado} a ${estado}`]
  );

  return res.json({ mensaje: 'Estado actualizado.', nuevoEstado: estado });
};

// --- Reasignar ticket (manual) ---
exports.reasignar = async (req, res) => {
  const { id } = req.params;
  const { analista_id, motivo } = req.body;

  if (!analista_id) {
    return res.status(400).json({ error: 'analista_id es obligatorio.' });
  }

  const [analista] = await pool.query('SELECT id, nombre FROM usuarios WHERE id = ? AND rol = ? AND activo = 1',
    [analista_id, 'analista']);
  if (analista.length === 0) {
    return res.status(400).json({ error: 'Analista no válido.' });
  }

  const [existe] = await pool.query('SELECT id, analista_id FROM tickets WHERE id = ?', [id]);
  if (existe.length === 0) {
    return res.status(404).json({ error: 'Ticket no encontrado.' });
  }

  await pool.query(
    `UPDATE tickets SET analista_id = ?, estado = 'asignado',
       motivo_reasignacion = ?
     WHERE id = ?`,
    [analista_id, motivo || 'Reasignación manual', id]
  );

  await pool.query(
    `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'reasignar_ticket', ?)`,
    [req.usuario.id, `Ticket #${id} reasignado a ${analista[0].nombre}`]
  );

  return res.json({ mensaje: 'Ticket reasignado.', analista: analista[0].nombre });
};