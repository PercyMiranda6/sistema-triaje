const { SEVERIDAD_NIVEL } = require('./constants');

/**
 * Calcula el Priority Score dinámico (RF05).
 * Combina la severidad del fallo (60%) con la frustración del cliente (40%).
 * Rango final: 0 - 100.
 */
function clampi(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calcularPriorityScore({ severidad, scoreFrustracion }) {
  const nivel = SEVERIDAD_NIVEL[severidad] || 1;
  const frustracion = Number(scoreFrustracion) || 0;

  const pesoSeveridad = (nivel / 4) * 0.6;
  const pesoFrustracion = clampi(frustracion, 0, 1) * 0.4;
  const score = Math.round((pesoSeveridad + pesoFrustracion) * 100);

  return clampi(score, 0, 100);
}

function etiquetaPrioridad(score) {
  if (score >= 80) return 'Critica';
  if (score >= 60) return 'Alta';
  if (score >= 35) return 'Media';
  return 'Baja';
}

module.exports = { calcularPriorityScore, etiquetaPrioridad };