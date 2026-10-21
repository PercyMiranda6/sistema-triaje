const CATEGORIAS = ['Hardware', 'Software', 'Redes', 'Accesos', 'Base de Datos'];

const SEVERIDADES = ['Baja', 'Media', 'Alta', 'Critica'];

const SENTIMIENTOS = ['Positivo', 'Neutro', 'Frustrado'];

const ESTADOS = ['nuevo', 'asignado', 'en_proceso', 'resuelto', 'cerrado', 'rechazado'];

const ROLES = ['cliente', 'analista', 'administrador'];

const SEVERIDAD_NIVEL = { Baja: 1, Media: 2, Alta: 3, Critica: 4 };

const SLA_HORAS = { Baja: 24, Media: 8, Alta: 4, Critica: 2 };

const PROVIDER = { groq: 'groq', gemini: 'gemini', fallback: 'fallback_local' };

const PROMPT_SYSTEM =
  'Actúa como un experto en triaje de soporte TI. ' +
  'Analiza el siguiente texto de un ticket de soporte. ' +
  'Debes clasificar la categoría técnica, determinar la severidad del problema y evaluar la polaridad emocional/sentimiento del usuario.';

const PROMPT_FORMATO =
  'Responde SOLO con un objeto JSON válido, sin texto adicional, sin explicaciones y sin bloques de código, ' +
  'con EXACTAMENTE esta estructura: ' +
  JSON.stringify({
    categoria: 'Debe ser EXACTAMENTE uno de estos valores: "Hardware", "Software", "Redes", "Accesos", "Base de Datos"',
    severidad: 'Debe ser EXACTAMENTE uno de estos valores: "Baja", "Media", "Alta", "Critica"',
    sentimiento: 'Debe ser EXACTAMENTE uno de estos valores: "Positivo", "Neutro", "Frustrado"',
    score_frustracion: 'Numero float de 0.0 (Calmo) a 1.0 (Muy Frustrado)',
    resumen_ejecutivo: 'Breve sintesis del problema en 15 palabras',
  }) +
  '. IMPORTANTE: en los campos "categoria", "severidad" y "sentimiento" debes copiar literalmente uno de los ' +
  'valores permitidos, sin agregar sinonimos, sin prefijos y sin texto adicional (por ejemplo, si el problema es ' +
  'de red escribe "Redes", no "Red - Conectividad"; si el usuario esta molesto escribe "Frustrado", no "Negativo").';

module.exports = {
  CATEGORIAS,
  SEVERIDADES,
  SENTIMIENTOS,
  ESTADOS,
  ROLES,
  SEVERIDAD_NIVEL,
  SLA_HORAS,
  PROVIDER,
  PROMPT_SYSTEM,
  PROMPT_FORMATO,
};