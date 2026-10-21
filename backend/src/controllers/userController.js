const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { CATEGORIAS } = require('../utils/constants');

exports.listarAnalistas = async (req, res) => {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.especialidad, u.activo,
            (SELECT COUNT(*) FROM tickets t
              WHERE t.analista_id = u.id AND t.estado IN ('nuevo','asignado','en_proceso')) AS carga_activa
       FROM usuarios u
      WHERE u.rol = 'analista'
      ORDER BY u.especialidad ASC, u.nombre ASC`
  );
  return res.json({ analistas: filas });
};

exports.crearAnalista = async (req, res) => {
  const { nombre, email, password, especialidad } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios.' });
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

exports.desactivarAnalista = async (req, res) => {
  const { id } = req.params;
  const [existe] = await pool.query('SELECT id FROM usuarios WHERE id = ? AND rol = ?', [id, 'analista']);
  if (existe.length === 0) {
    return res.status(404).json({ error: 'Analista no encontrado.' });
  }
  await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
  return res.json({ mensaje: 'Analista desactivado.' });
};