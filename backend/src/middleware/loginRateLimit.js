const intentos = new Map();

const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

function limitarLogin(req, res, next) {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const claves = [req.ip, `${req.ip}:${email || 'sin-email'}`];
  const ahora = Date.now();
  for (const clave of claves) {
    const registro = intentos.get(clave);
    if (!registro || ahora - registro.inicio >= VENTANA_MS) {
      intentos.set(clave, { inicio: ahora, cantidad: 0 });
    }
  }

  const bloqueado = claves.map((clave) => intentos.get(clave)).find((registro) => registro.cantidad >= MAX_INTENTOS);
  if (bloqueado) {
    const espera = Math.ceil((VENTANA_MS - (ahora - bloqueado.inicio)) / 1000);
    res.set('Retry-After', String(espera));
    return res.status(429).json({ error: 'Demasiados intentos. Inténtalo nuevamente más tarde.' });
  }

  req.registrarFalloLogin = () => {
    for (const clave of claves) {
      const estado = intentos.get(clave) || { inicio: Date.now(), cantidad: 0 };
      estado.cantidad += 1;
      intentos.set(clave, estado);
    }
  };
  req.limpiarFalloLogin = () => claves.forEach((clave) => intentos.delete(clave));
  return next();
}

module.exports = { limitarLogin };
