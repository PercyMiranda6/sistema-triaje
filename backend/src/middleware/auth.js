const jwt = require('jsonwebtoken');
const { ROLES } = require('../utils/constants');

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado: token no proporcionado.' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado.' });
  }
}

function autorizar(...roles) {
  return (req, res, next) => {
    const valido = ROLES.filter((r) => roles.includes(r));
    if (!req.usuario || !valido.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Prohibido: no tienes el rol requerido.' });
    }
    return next();
  };
}

module.exports = { autenticar, autorizar, firmarToken };