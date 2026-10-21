/**
 * Fallback local por reglas de palabras clave (RNF03).
 * Se usa cuando la API de IA externa está caída o no hay clave configurada.
 * Retorna la MISMA estructura JSON que produce el LLM.
 */

const CATEGORIA_CLAVES = {
  Hardware: ['teclado', 'mouse', 'monitor', 'impresora', 'escáner', 'scanner', 'laptop',
    'notebook', 'pc', 'cpu', 'disco', 'ram', 'memoria', 'batería', 'bateria', 'cargador',
    'audífono', 'audifono', 'pantalla', 'cámara', 'camara', 'usb', 'hardware', 'ups', 'toma', 'puerto'],
  Software: ['software', 'aplicación', 'aplicacion', 'instalar', 'instalación', 'actualizar',
    'actualización', 'actualizacion', 'windows', 'office', 'excel', 'word', 'outlook', 'programa',
    'sistema', 'bug', 'error de', 'aplicativo', 'licencia', 'descargar', 'ejecutar', 'crash',
    'congelado', 'no abre', 'no responde', 'versión', 'compatible'],
  Redes: ['internet', 'wifi', 'wi-fi', 'red', 'router', 'routers', 'vpn', 'conexión', 'conexion',
    'latencia', 'dns', 'enlace', 'sin señal', 'señal', 'senal', 'cable', 'red lan', 'wlan',
    'parpadea', 'mac address', 'ip', 'correo no llega', 'intranet', 'portal web'],
  Accesos: ['contraseña', 'contra', 'password', 'clave', 'acceso', 'login', 'log in', 'iniciar sesión',
    'usuario bloqueado', 'bloqueado', 'desbloquear', 'permiso', 'permisos', 'cuenta', 'token',
    'autenticación', 'autenticar', '2fa', 'otp', 'dominio', 'reset de clave', 'olvidé mi clave',
    'no me deja ingresar', 'no puedo entrar'],
  'Base de Datos': ['base de datos', 'bd', 'sql', 'consulta', 'query', 'reporte', 'carga',
    'información', 'informacion', 'migración', 'migracion', 'backup', 'respaldo', 'mysql',
    'oracle', 'postgres', 'etl', 'datos', 'registro duplicado', 'procedimiento', 'tabla'],
};

const SEVERIDAD_CLAVES = {
  Critica: ['caído', 'caido', 'caída', 'caida', 'todo el sistema', 'producción', 'produccion',
    'cae', 'colapsó', 'colapso', 'emergencia', 'urgente', 'inmediatamente', 'total', 'pánico',
    'panic', 'outage', 'down', 'no funciona nada', 'parado', 'detenido', 'bloqueo total'],
  Alta: ['no puedo trabajar', 'no puedo hacer mi trabajo', 'imposible', 'grave', 'pantalla azul',
    'pérdida de datos', 'perdida de datos', 'reunión', 'entrega', 'deadline', 'hoy', 'hoy mismo',
    'no puedo continuar', 'inoperativo', 'bloqueado'],
  Media: ['lentitud', 'lento', 'intermitente', 'problema', 'no carga', 'tarda', 'falla', 'falla',
    'errores', 'error', 'se corta', 'corta', 'no abre bien', 'defecto'],
  Baja: ['consulta', 'pregunta', 'duda', 'información', 'informacion', 'requisito', 'solicitud',
    'ayuda con', 'como configuro', 'como hago', 'orientación', 'orientacion', 'me gustaría saber'],
};

const SENTIMIENTO_CLAVES = {
  Frustrado: ['molesto', 'frustrado', 'harto', 'enojado', 'enojo', 'irritado', 'desesperado',
    'inaceptable', 'insoportable', 'otra vez', 'nunca', 'siempre', 'quej', 'estoy cansado',
    'me tienen', 'basta', 'verguenza', 'vergüenza', 'decepcionado', 'mala atención', 'mal servicio'],
  Positivo: ['gracias', 'agradecido', 'agradezco', 'amable', 'saludos', 'por favor', 'gran',
    'excelente', 'perfecto', 'satisfecho', 'contento', 'aprecio', 'genial', 'muy amable',
    'me ayudó', 'me ayudo', 'resuelto'],
  // Neutro por defecto
};

function puntuar(conteos) {
  return Object.entries(conteos)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

function normalizar(t) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function analizarPorClaves(texto) {
  const t = normalizar(texto);
  const min = (arr) => arr.some((k) => t.includes(normalizar(k)));

  // Categoría
  const conteoCategoria = {};
  for (const [cat, claves] of Object.entries(CATEGORIA_CLAVES)) {
    conteoCategoria[cat] = claves.filter((k) => t.includes(normalizar(k))).length;
  }
  const [categoria] = puntuar(conteoCategoria);
  const catElegida = categoria ? categoria[0] : 'Software';

  // Severidad
  const conteoSeveridad = {};
  for (const [sev, claves] of Object.entries(SEVERIDAD_CLAVES)) {
    conteoSeveridad[sev] = claves.filter((k) => t.includes(normalizar(k))).length;
  }
  const [severidad] = puntuar(conteoSeveridad);
  const sevElegida = severidad ? severidad[0] : 'Baja';

  // Sentimiento
  const conS = { Frustrado: SENTIMIENTO_CLAVES.Frustrado.filter((k) => t.includes(normalizar(k))).length,
    Positivo: SENTIMIENTO_CLAVES.Positivo.filter((k) => t.includes(normalizar(k))).length };
  let sentimiento = 'Neutro';
  if (conS.Frustrado >= conS.Positivo && conS.Frustrado > 0) sentimiento = 'Frustrado';
  else if (conS.Positivo > conS.Frustrado && conS.Positivo > 0) sentimiento = 'Positivo';

  // Score de frustración heurístico
  const exclamaciones = Math.min((texto.match(/!/g) || []).length, 4);
  let base = sentimiento === 'Frustrado' ? 0.7 : sentimiento === 'Neutro' ? 0.35 : 0.12;
  base += exclamaciones * 0.08;
  const nivelSev = sevElegida === 'Critica' ? 0.1 : sevElegida === 'Alta' ? 0.06 : 0;
  const score = Math.min(1, Math.round((base + nivelSev) * 100) / 100);

  const palabras = texto.split(/\s+/).slice(0, 15).join(' ');
  const resumen_ejecutivo = palabras.length > 15 ? palabras.split(' ').slice(0, 15).join(' ') : palabras;

  return {
    categoria: catElegida,
    severidad: sevElegida,
    sentimiento,
    score_frustracion: score,
    resumen_ejecutivo,
  };
}

module.exports = { analizarPorClaves };