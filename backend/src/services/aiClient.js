/**
 * Módulo de Inteligencia Artificial / PLN (Google Gemini / Groq API).
 * Envía el texto anonimizado al LLM exigiendo una respuesta JSON válida.
 * Orden de prelación: Groq -> Gemini -> fallback local por palabras clave.
 */

const { PROVIDER, PROMPT_SYSTEM, PROMPT_FORMATO } = require('../utils/constants');
const { anonimizar } = require('./piiService');
const { analizarPorClaves } = require('./keywordFallback');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

function extraerJSON(texto) {
  if (!texto) return null;
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

// --- Normalizacion de enums (defensiva frente a respuestas del LLM con sinonimos) ---
const CLAVES_CATEGORIA = [
  ['Base de Datos', ['base de datos', 'bases de datos', 'bd', 'mysql', 'sql', 'data warehouse']],
  ['Accesos', ['acceso', 'accesos', 'login', 'password', 'contrasena', 'permiso', 'cuenta', 'token', 'autenticacion']],
  ['Redes', ['red', 'redes', 'conectividad', 'conexion', 'vpn', 'wifi', 'wi-fi', 'internet', 'network', 'dns', 'router']],
  ['Hardware', ['hardware', 'equipo', 'impresora', 'laptop', 'portatil', 'notebook', 'monitor', 'teclado', 'mouse', 'servidor', 'disco']],
  ['Software', ['software', 'aplicacion', 'aplicativo', 'programa', 'sistema', 'windows', 'office', 'excel', 'navegador', 'app']],
];

const CLAVES_SENTIMIENTO = [
  ['Frustrado', ['frustrado', 'frustrada', 'negativo', 'negativa', 'molesto', 'molesta', 'enojado', 'enojada', 'irritado', 'enfadado', 'desesperado', 'malestar']],
  ['Positivo', ['positivo', 'positiva', 'satisfecho', 'satisfecha', 'agradecido', 'agradecida', 'alegre', 'contento']],
  ['Neutro', ['neutro', 'neutra', 'neutral']],
];

const CLAVES_SEVERIDAD = [
  ['Critica', ['critica', 'critico', 'criticas', 'criticos', 'grave', 'maxima', 'urgente']],
  ['Alta', ['alta', 'alto', 'severa', 'severo', 'importante']],
  ['Media', ['media', 'medio', 'moderada', 'moderado']],
  ['Baja', ['baja', 'bajo', 'leve', 'minima', 'consulta']],
];

const sinAcentos = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function normalizarEnum(valor, permitidos, tablaClaves) {
  const v = sinAcentos(valor);
  if (!v) return null;
  // 1) coincidencia exacta (ignorando mayusculas y acentos)
  for (const p of permitidos) {
    if (sinAcentos(p) === v) return p;
  }
  // 2) coincidencia por sinonimos o por inclusion del termino clave
  for (const [canonico, claves] of tablaClaves) {
    if (claves.some((k) => v === k || v.includes(k))) return canonico;
  }
  return null;
}

function validarTriage(obj) {
  const cats = ['Hardware', 'Software', 'Redes', 'Accesos', 'Base de Datos'];
  const sevs = ['Baja', 'Media', 'Alta', 'Critica'];
  const sents = ['Positivo', 'Neutro', 'Frustrado'];

  if (!obj) return null;

  const categoria = normalizarEnum(obj.categoria, cats, CLAVES_CATEGORIA);
  const severidad = normalizarEnum(obj.severidad, sevs, CLAVES_SEVERIDAD);
  const sentimiento = normalizarEnum(obj.sentimiento, sents, CLAVES_SENTIMIENTO);

  // Si alguno no se puede mapear a un valor canonico, la respuesta no es utilizable.
  if (!categoria || !severidad || !sentimiento) return null;

  const score = Number(obj.score_frustracion);
  if (Number.isNaN(score)) return null;

  return {
    categoria,
    severidad,
    sentimiento,
    score_frustracion: Math.min(1, Math.max(0, score)),
    resumen_ejecutivo: String(obj.resumen_ejecutivo || '').slice(0, 300),
  };
}

async function pedirGroq(texto, clave, modelo) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify({
      model: modelo,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SYSTEM },
        { role: 'user', content: `texto del ticket:\n${texto}\n\n${PROMPT_FORMATO}` },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices && data.choices[0] ? data.choices[0].message.content : null;
}

async function pedirGemini(texto, clave, modelo) {
  const res = await fetch(GEMINI_URL(modelo, clave), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT_SYSTEM },
            { text: `texto del ticket:\n${texto}\n\n${PROMPT_FORMATO}` },
          ],
        },
      ],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const partes = data.candidates?.[0]?.content?.parts;
  return partes && partes.length > 0 ? partes.map((p) => p.text).join('') : null;
}

/**
 * Ejecuta el triaje completo: anonimiza el texto y llama al LLM.
 * @returns {{ proveedor: string, resultado, textoAnonimizado, detecciones, latenciaMs }}
 */
async function ejecutarTriaje({ asunto, descripcion }) {
  const textoCompleto = `${asunto}. ${descripcion}`;
  const { texto: textoAnonimizado, detecciones } = anonimizar(textoCompleto);

  const inicio = Date.now();
  let resultado = null;
  let proveedor = null;
  let respuestaBruta = null;
  let error = null;

  // 1) Groq (prioritario)
  if (process.env.GROQ_API_KEY) {
    try {
      respuestaBruta = await pedirGroq(textoAnonimizado, process.env.GROQ_API_KEY, process.env.GROQ_MODEL);
      resultado = validarTriage(extraerJSON(respuestaBruta));
      if (resultado) proveedor = PROVIDER.groq;
    } catch (e) {
      error = e;
    }
  }

  // 2) Gemini (fallback de API)
  if (!resultado && process.env.GEMINI_API_KEY) {
    try {
      respuestaBruta = await pedirGemini(textoAnonimizado, process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL);
      resultado = validarTriage(extraerJSON(respuestaBruta));
      if (resultado) proveedor = PROVIDER.gemini;
    } catch (e) {
      error = e;
    }
  }

  // 3) Fallback local por palabras clave (RNF03)
  if (!resultado) {
    const motivo = error
      ? `error de API: ${error.message}`
      : respuestaBruta
        ? 'la respuesta del LLM no cumple el esquema de salida esperado'
        : 'no hay proveedor de IA configurado';
    console.warn(`[TRIAGE] Degradando a fallback_local (${motivo}).`);
    resultado = analizarPorClaves(textoAnonimizado);
    proveedor = PROVIDER.fallback;
  }

  const latenciaMs = Date.now() - inicio;

  return { proveedor, resultado, textoAnonimizado, detecciones, latenciaMs, error, respuestaBruta };
}

module.exports = { ejecutarTriaje };