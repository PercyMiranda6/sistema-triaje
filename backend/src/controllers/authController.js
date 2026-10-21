const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { firmarToken } = require('../middleware/auth');

const SALT = 10;

exports.registrar = async (req, res) => {
  const { nombre, email, password, rol, especialidad } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT);

  try {
    const [resultado] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email.toLowerCase().trim(), passwordHash, rol || 'cliente', especialidad || null]
    );

    const usuario = { id: resultado.insertId, nombre, email, rol: rol || 'cliente' };
    const token = firmarToken(usuario);

    return res.status(201).json({
      mensaje: 'Usuario registrado con éxito.',
      token,
      usuario,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }
    throw err;
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios.' });
  }

  const [filas] = await pool.query(
    'SELECT * FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1',
    [email.toLowerCase().trim()]
  );

  if (filas.length === 0) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const usuario = filas[0];
  const coincide = await bcrypt.compare(password, usuario.password_hash);

  if (!coincide) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const token = firmarToken(usuario);

  return res.json({
    mensaje: 'Inicio de sesión exitoso.',
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      especialidad: usuario.especialidad,
    },
  });
};

exports.perfil = (req, res) => {
  return res.json({ usuario: req.usuario });
};