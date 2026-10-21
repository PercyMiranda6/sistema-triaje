// Verificacion del filtro de PII (Ley N. 29733) - evidencia de seguridad
const { anonimizar } = require('../src/services/piiService');

const CASOS = [
  { nombre: 'DNI con contexto', texto: 'Buenos dias, soy Roberto Diaz, mi DNI es 44236789, correo roberto.diaz@gmail.com y mi clave es abc123.' },
  { nombre: 'Credencial con dos puntos', texto: 'La clave: s3cr3t123 no me deja entrar.' },
  { nombre: 'Contrasena con tilde', texto: 'Mi contraseña es P@ssw0rd2026 por favor.' },
  { nombre: 'Password en ingles', texto: 'password: hunter2 es mi clave de acceso' },
  { nombre: 'Telefono', texto: 'Mi telefono es +51 987 654 321 y mi tarjeta 4111 1111 1111 1111.' },
  { nombre: 'Honorifico', texto: 'El Sr. Carlos Mendoza no puede acceder a la plataforma.' },
  { nombre: 'Frase inductora', texto: 'Te escribo de parte de la Sra. Lucia Fernandez, solicitud con el folio 12345.' },
  { nombre: 'Sin datos personales', texto: 'La aplicacion no carga desde la manana en el servidor de produccion.' },
];

console.log('CASO | TEXTO ANONIMIZADO | DETECCIONES');
console.log('-'.repeat(120));
let fallas = 0;
for (const c of CASOS) {
  const r = anonimizar(c.texto);
  console.log(`${c.nombre} | ${r.texto} | ${r.detecciones.map((d) => d.tipo + 'x' + d.reemplazos).join(', ') || '(sin deteccion)'}`);
}

// Verificacion automatica de no filtracion
const CHEQUEOS = [
  { texto: 'Buenos dias, soy Roberto Diaz, mi DNI es 44236789, correo roberto.diaz@gmail.com y mi clave es abc123.', no_debe: ['44236789', 'roberto.diaz@gmail.com', 'abc123', 'Roberto', 'Diaz'] },
  { texto: 'La clave: s3cr3t123 no me deja entrar.', no_debe: ['s3cr3t123'] },
  { texto: 'Mi contraseña es P@ssw0rd2026 por favor.', no_debe: ['P@ssw0rd2026'] },
  { texto: 'Mi telefono es +51 987 654 321 y mi tarjeta 4111 1111 1111 1111.', no_debe: ['987 654 321', '4111 1111 1111 1111'] },
  { texto: 'El Sr. Carlos Mendoza no puede acceder a la plataforma.', no_debe: ['Carlos', 'Mendoza'] },
];
console.log('\n=== VERIFICACION DE NO FILTRACION ===');
for (const c of CHEQUEOS) {
  const salida = anonimizar(c.texto).texto;
  const filtrado = c.no_debe.filter((p) => salida.includes(p));
  if (filtrado.length) { fallas++; console.log(`FALLA  -> "${c.texto}" -> se filtra: ${filtrado.join(', ')}`); }
  else console.log(`PASA   -> "${c.texto}" -> ${salida}`);
}
console.log(`\nTotal filtraciones detectadas: ${fallas}`);
process.exit(fallas > 0 ? 1 : 0);
