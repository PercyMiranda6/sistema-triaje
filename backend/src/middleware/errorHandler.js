function noEncontrado(req, res) {
  return res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function errorGlobal(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado: el dato ya existe.' });
  }

  const status = err.status || 500;
  const mensaje =
    status >= 500
      ? 'Error interno del servidor. Inténtalo nuevamente.'
      : err.message;

  return res.status(status).json({
    error: mensaje,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detalle: String(err.message) } : {}),
  });
}

module.exports = { noEncontrado, errorGlobal };