/**
 * Middleware de Anonimización (Filtro PII - RF03).
 * Detecta y enmascara Datos de Identificación Personal antes de enviar a la API de IA.
 * Cumple el espíritu de la Ley N° 29733 (Protección de Datos Personales, Perú).
 */

// Patrones de PII
const PATRONES = [
  {
    nombre: 'DNI',
    etiqueta: '[DNI]',
    // 8 dígitos consecutivos (formato DNI peruano) que no forman parte de un número mayor
    regex: /(?<!\d)\d{8}(?!\d)/g,
  },
  {
    nombre: 'Tarjeta',
    etiqueta: '[TARJETA]',
    // 13-19 dígitos, opcionalmente separados por espacios o guiones (Visa/MC/Amex)
    regex: /\b(?:\d[ -]?){12,18}\d\b/g,
  },
  {
    nombre: 'Teléfono',
    etiqueta: '[TELEFONO]',
    regex: /(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?!\d)/g,
  },
  {
    nombre: 'Email',
    etiqueta: '[EMAIL]',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    nombre: 'Credencial',
    etiqueta: '[CREDENCIAL]',
    // contrasena/clave/password seguidos de ':' '=' o de la forma "es/is" (caso "mi clave es abc123")
    regex: /(?:contraseña|contrasea|password|clave|passwd|pin|usuario\s*de\s*login)\s*(?:de\s+acceso|personal)?\s*(?:[:=]\s*|\s+(?:es|son|is)\s+)\s*\S+/gi,
  },
];

// Frases que anteceden al nombre de una persona
const FRASES_NOMBRE = [
  'mi nombre es', 'me llamo', 'soy', 'habla', 'atiende', 'te escribo',
  'solicito con', 'registrado como', 'del usuario', 'del sr', 'del sr.',
  'la sra', 'el sr', 'la señora', 'el señor', 'la srta', 'asistido por',
  'atendido por', 'ayudado por', 'atendido', 'asistido', 'ayudado',
];

/**
 * Enmascara nombres propios mediante frases indicadoras.
 * Ej: "me llamo Juan Pérez" -> "me llamo [NOMBRE] [NOMBRE]"
 */
function enmascararNombres(texto) {
  const palabras = texto.split(/\s+/);
  const min = (w) => w.toLowerCase().replace(/[.,;:!?()]/g, '');
  const esHonorifico = (w) => /^(sr|sra|dr|dra|ing|lic|srta|srita)$/.test(min(w).replace(/\.$/g, ''));

  const fraseEn = (i) => {
    let coincide = null;
    for (const f of FRASES_NOMBRE) {
      const partes = f.split(' ');
      let ok = true;
      for (let k = 0; k < partes.length; k++) {
        if (i + k >= palabras.length || min(palabras[i + k]) !== partes[k]) {
          ok = false;
          break;
        }
      }
      if (ok && (!coincide || f.split(' ').length > coincide.split(' ').length)) coincide = f;
    }
    return coincide;
  };

  for (let i = 0; i < palabras.length; i++) {
    let inicio = null;
    let limite = 3;

    const frase = fraseEn(i);
    if (frase) {
      inicio = i + frase.split(' ').length;
    } else if (esHonorifico(palabras[i])) {
      inicio = i + 1;
      limite = 2;
    }

    if (inicio === null) continue;

    let aplicados = 0;
    let j = inicio;
    while (aplicados < limite && j < palabras.length) {
      const limpia = palabras[j].replace(/[.,;:!?()]/g, '');
      if (limpia.length > 1 && /^[A-ZÁÉÍÓÚÑ]/.test(limpia)) {
        palabras[j] = '[NOMBRE]';
        aplicados++;
        j++;
      } else {
        break;
      }
    }
    if (aplicados > 0) {
      i = j - 1;
    }
  }

  return palabras.join(' ');
}

/**
 * Aplica los patrones de PII y enmascara nombres.
 * @returns {{ texto: string, detecciones: Array<{tipo:string, reemplazos:number}> }}
 */
function anonimizar(texto) {
  const detecciones = [];
  let resultado = texto;

  for (const patron of PATRONES) {
    const reemplazos = resultado.match(patron.regex);
    if (reemplazos && reemplazos.length > 0) {
      resultado = resultado.replace(patron.regex, patron.etiqueta);
      detecciones.push({ tipo: patron.nombre, reemplazos: reemplazos.length });
    }
  }

  const antes = resultado;
  resultado = enmascararNombres(resultado);
  const totalNombres = (resultado.match(/\[NOMBRE\]/g) || []).length;
  if (totalNombres > 0) {
    detecciones.push({ tipo: 'Nombre', reemplazos: totalNombres });
  }

  return { texto: resultado, detecciones };
}

module.exports = { anonimizar };