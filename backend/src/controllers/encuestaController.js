const { pool } = require('../config/db');
const { anonimizar } = require('../services/piiService');

/**
 * POST /api/encuestas/csat
 * Cliente responde CSAT una sola vez por ticket cerrado/resuelto.
 */
const responderCsat = async (req, res) => {
  try {
    const { ticketId, puntuacion, comentario } = req.body;
    const clienteId = req.usuario.id;

    if (!ticketId || !puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: 'ticketId y puntuacion (1-5) son obligatorios.' });
    }

    // Validar que el ticket exista y pertenezca al cliente
    const [ticket] = await pool.query(
      'SELECT id, cliente_id, estado FROM tickets WHERE id = ?',
      [ticketId]
    );
    if (ticket.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado.' });
    }
    if (ticket[0].cliente_id !== clienteId) {
      return res.status(403).json({ error: 'No eres el propietario de este ticket.' });
    }
    if (!['resuelto', 'cerrado'].includes(ticket[0].estado)) {
      return res.status(400).json({
        error: 'Solo puedes calificar tickets que estén resueltos o cerrados.',
      });
    }

    // Verificar que no haya respondido ya (doble seguridad con UNIQUE KEY en DB)
    const [yaRespondio] = await pool.query(
      'SELECT id FROM encuesta_csat WHERE ticket_id = ? AND cliente_id = ?',
      [ticketId, clienteId]
    );
    if (yaRespondio.length > 0) {
      return res.status(400).json({ error: 'Ya respondiste la encuesta de este ticket.' });
    }

    // Anonimizar PII en el comentario (Ley N° 29733)
    let comentarioAnonimizado = null;
    if (comentario && comentario.trim()) {
      comentarioAnonimizado = anonimizar(comentario).texto;
    }

    await pool.query(
      `INSERT INTO encuesta_csat (ticket_id, cliente_id, puntuacion, comentario)
       VALUES (?, ?, ?, ?)`,
      [ticketId, clienteId, puntuacion, comentarioAnonimizado]
    );

    // Auditoría
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'responder_csat', ?)`,
      [clienteId, `Ticket #${ticketId} calificado con CSAT ${puntuacion}/5`]
    );

    return res.json({
      mensaje: 'Gracias por calificar la atención.',
      puntuacion,
    });
  } catch (err) {
    console.error('Error responderCsat:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/encuestas/csat/estado/:ticketId
 * Verifica si el cliente puede responder CSAT para este ticket.
 */
const estadoCsat = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const clienteId = req.usuario.id;

    const [ticket] = await pool.query(
      'SELECT id, estado FROM tickets WHERE id = ?',
      [ticketId]
    );
    if (ticket.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado.' });
    }

    const [yaRespondio] = await pool.query(
      'SELECT id FROM encuesta_csat WHERE ticket_id = ? AND cliente_id = ?',
      [ticketId, clienteId]
    );

    const mostrarEncuesta =
      ['resuelto', 'cerrado'].includes(ticket[0].estado) && yaRespondio.length === 0;

    return res.json({
      ticketId: Number(ticketId),
      estado: ticket[0].estado,
      yaRespondio: yaRespondio.length > 0,
      mostrarEncuesta,
    });
  } catch (err) {
    console.error('Error estadoCsat:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/encuestas/csat/metricas
 * Métricas agregadas de CSAT (solo analista/administrador).
 */
const metricasCsat = async (req, res) => {
  try {
    const [promedio] = await pool.query(
      `SELECT
         COUNT(*) AS total_respuestas,
         ROUND(AVG(puntuacion), 2) AS promedio,
         SUM(puntuacion = 5) AS cincos,
         SUM(puntuacion = 4) AS cuatros,
         SUM(puntuacion = 3) AS treses,
         SUM(puntuacion = 2) AS dos,
         SUM(puntuacion = 1) AS unos
       FROM encuesta_csat`
    );

    const [porCategoria] = await pool.query(
      `SELECT
         t.categoria,
         COUNT(*) AS total,
         ROUND(AVG(e.puntuacion), 2) AS promedio
       FROM encuesta_csat e
       JOIN tickets t ON t.id = e.ticket_id
       WHERE t.categoria IS NOT NULL
       GROUP BY t.categoria
       ORDER BY total DESC`
    );

    const [porAnalista] = await pool.query(
      `SELECT
         u.nombre,
         u.especialidad,
         COUNT(*) AS total,
         ROUND(AVG(e.puntuacion), 2) AS promedio
       FROM encuesta_csat e
       JOIN tickets t ON t.id = e.ticket_id
       JOIN usuarios u ON u.id = t.analista_id
       WHERE t.analista_id IS NOT NULL
       GROUP BY u.id, u.nombre, u.especialidad
       ORDER BY total DESC`
    );

    const [porMes] = await pool.query(
      `SELECT
         DATE_FORMAT(fecha_respuesta, '%Y-%m') AS mes,
         COUNT(*) AS total,
         ROUND(AVG(puntuacion), 2) AS promedio
       FROM encuesta_csat
       GROUP BY mes
       ORDER BY mes ASC
       LIMIT 12`
    );

    return res.json({
      promedio: promedio[0],
      porCategoria,
      porAnalista,
      porMes,
    });
  } catch (err) {
    console.error('Error metricasCsat:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * POST /api/encuestas/nps
 * Cliente responde NPS (escala 0-10).
 */
const responderNps = async (req, res) => {
  try {
    const { puntuacion, comentario, periodo } = req.body;
    const clienteId = req.usuario.id;

    if (!puntuacion || puntuacion < 0 || puntuacion > 10) {
      return res.status(400).json({ error: 'puntuacion (0-10) es obligatoria.' });
    }

    let comentarioAnonimizado = null;
    if (comentario && comentario.trim()) {
      comentarioAnonimizado = anonimizar(comentario).texto;
    }

    await pool.query(
      `INSERT INTO respuesta_nps (cliente_id, puntuacion, comentario, periodo)
       VALUES (?, ?, ?, ?)`,
      [clienteId, puntuacion, comentarioAnonimizado, periodo || null]
    );

    // Auditoría
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'responder_nps', ?)`,
      [clienteId, `NPS calificado con ${puntuacion}/10`]
    );

    return res.json({
      mensaje: 'Gracias por tu respuesta NPS.',
      puntuacion,
    });
  } catch (err) {
    console.error('Error responderNps:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/encuestas/nps/metricas
 * Métricas agregadas de NPS (solo analista/administrador).
 */
const metricasNps = async (req, res) => {
  try {
    const [resumen] = await pool.query(
      `SELECT
         COUNT(*) AS total_respuestas,
         ROUND(AVG(puntuacion), 2) AS promedio,
         SUM(puntuacion >= 9) AS promotores,
         SUM(puntuacion BETWEEN 7 AND 8) AS pasivos,
         SUM(puntuacion <= 6) AS detractores,
         ROUND(
           100 * (SUM(puntuacion >= 9) - SUM(puntuacion <= 6)) / NULLIF(COUNT(*), 0),
           1
         ) AS nps_score
       FROM respuesta_nps`
    );

    const [porPeriodo] = await pool.query(
      `SELECT
         COALESCE(periodo, 'Sin periodo') AS periodo,
         COUNT(*) AS total,
         ROUND(AVG(puntuacion), 2) AS promedio,
         ROUND(
           100 * (SUM(puntuacion >= 9) - SUM(puntuacion <= 6)) / NULLIF(COUNT(*), 0),
           1
         ) AS nps_score
       FROM respuesta_nps
       GROUP BY periodo
       ORDER BY periodo DESC`
    );

    return res.json({
      resumen: resumen[0],
      porPeriodo,
    });
  } catch (err) {
    console.error('Error metricasNps:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = {
  responderCsat,
  estadoCsat,
  metricasCsat,
  responderNps,
  metricasNps,
};
