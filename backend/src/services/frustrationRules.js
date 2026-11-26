const normalizar = (texto) =>
  String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const REGLAS = [
  { etiqueta: 'bloqueo laboral', claves: ['no puedo trabajar', 'no puedo continuar', 'todo el sistema', 'nadie puede trabajar'], peso: 0.28 },
  { etiqueta: 'espera prolongada', claves: ['desde hace horas', 'desde ayer', 'desde el lunes', 'llevo dias', 'nadie responde'], peso: 0.22 },
  { etiqueta: 'lenguaje de molestia', claves: ['harto', 'molesto', 'frustrado', 'inaceptable', 'desesperado', 'enojado', 'basta'], peso: 0.24 },
  { etiqueta: 'incidencia repetida', claves: ['otra vez', 'siempre', 'nunca funciona', 'por tercera vez'], peso: 0.14 },
];

function evaluarFrustracion(texto) {
  const original = String(texto || '');
  const normalizado = normalizar(original);
  const indicadores = [];
  let score = 0.1;

  for (const regla of REGLAS) {
    if (regla.claves.some((clave) => normalizado.includes(normalizar(clave)))) {
      indicadores.push(regla.etiqueta);
      score += regla.peso;
    }
  }

  const exclamaciones = Math.min((original.match(/!/g) || []).length, 3);
  if (exclamaciones > 0) {
    indicadores.push('uso de exclamaciones');
    score += exclamaciones * 0.05;
  }

  return {
    score: Math.min(1, Math.round(score * 100) / 100),
    indicadores,
    bloqueoCritico: /todo el sistema|produccion|producción|caido|caído|emergencia|nadie puede trabajar/i.test(original),
    impactoAlto: /no puedo trabajar|no puedo continuar|inoperativo|bloqueado/i.test(original),
  };
}

module.exports = { evaluarFrustracion };
