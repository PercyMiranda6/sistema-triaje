function validarComentario(valor, campo, maximo = 1000) {
  if (typeof valor !== 'string') {
    return { valor: '', error: `${campo} debe ser texto.` };
  }

  const limpio = valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (limpio.length > maximo) {
    return { valor: limpio, error: `${campo} no puede superar los ${maximo} caracteres.` };
  }
  if (/<script\b|javascript:|on[a-z]+\s*=/i.test(limpio)) {
    return { valor: limpio, error: `${campo} contiene contenido no permitido.` };
  }

  return { valor: limpio, error: null };
}

module.exports = { validarComentario };
