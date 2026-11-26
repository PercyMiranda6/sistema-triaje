const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { CATEGORIAS } = require('../utils/constants');

exports.listarAnalistas = async (req, res) => {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.especialidad, u.activo,
            (SELECT COUNT(*) FROM tickets t
              WHERE t.analista_id = u.id AND t.estado IN ('nuevo','asignado','en_proceso','reabierto')) AS carga_activa
       FROM usuarios u
      WHERE u.rol = 'analista' AND u.activo = 1
      ORDER BY u.especialidad ASC, u.nombre ASC`
  );
  return res.json({ analistas: filas });
};

exports.listarClientes = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 10;
  const offset = (page - 1) * limit;
  const [clientes] = await pool.query(
    `SELECT id, nombre, email, activo, creado_el
       FROM usuarios
      WHERE rol = 'cliente' AND activo = 1
      ORDER BY nombre ASC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'cliente' AND activo = 1`
  );
  return res.json({ clientes, paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) } });
};

exports.crearAnalista = async (req, res) => {
  const { nombre, email, password, especialidad } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }
  if (especialidad && !CATEGORIAS.includes(especialidad)) {
    return res.status(400).json({ error: `Especialidad inválida. Valores: ${CATEGORIAS.join(', ')}` });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [resultado] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad)
       VALUES (?, ?, ?, 'analista', ?)`,
      [nombre, email.toLowerCase().trim(), passwordHash, especialidad || null]
    );

    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'crear_analista', ?)`,
      [req.usuario.id, `Analista ${nombre} creado`]
    );

    return res.status(201).json({ mensaje: 'Analista creado.', id: resultado.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }
    throw err;
  }
};

exports.crearCliente = async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [resultado] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad)
       VALUES (?, ?, ?, 'cliente', NULL)`,
      [nombre.trim(), email.toLowerCase().trim(), passwordHash]
    );
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'crear_cliente', ?)`,
      [req.usuario.id, `Cliente ${nombre.trim()} creado`]
    );
    return res.status(201).json({ mensaje: 'Cliente creado.', id: resultado.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    throw err;
  }
};

exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, especialidad } = req.body;
  const [filas] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ? AND activo = 1', [id]);
  if (filas.length === 0 || !['analista', 'cliente'].includes(filas[0].rol)) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  if (!nombre?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios.' });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }
  if (especialidad && filas[0].rol === 'analista' && !CATEGORIAS.includes(especialidad)) {
    return res.status(400).json({ error: `Especialidad inválida. Valores: ${CATEGORIAS.join(', ')}` });
  }

  const campos = {
    nombre: nombre.trim(),
    email: email.toLowerCase().trim(),
    especialidad: filas[0].rol === 'analista' ? especialidad || null : null,
  };
  if (password) campos.password_hash = await bcrypt.hash(password, 10);
  try {
    await pool.query('UPDATE usuarios SET ? WHERE id = ?', [campos, id]);
    await pool.query(
      `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'actualizar_usuario', ?)`,
      [req.usuario.id, `Usuario #${id} actualizado`]
    );
    return res.json({ mensaje: 'Usuario actualizado.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    throw err;
  }
};

exports.desactivarAnalista = async (req, res) => {
  const { id } = req.params;
  const [existe] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ? AND rol IN (?, ?) AND activo = 1', [id, 'analista', 'cliente']);
  if (existe.length === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
  }
  await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
  await pool.query(
    `INSERT INTO auditoria (usuario_id, accion, detalle) VALUES (?, 'desactivar_usuario', ?)`,
    [req.usuario.id, `Usuario #${id} (${existe[0].rol}) desactivado`]
  );
  return res.json({ mensaje: 'Usuario desactivado.' });
};
