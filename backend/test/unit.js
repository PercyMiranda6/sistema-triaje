/**
 * Pruebas unitarias sin servidor ni base de datos.
 * Uso: node test/unit.js
 */
const assert = require('node:assert/strict');
const { calcularPriorityScore, etiquetaPrioridad } = require('../src/utils/priority');
const { anonimizar } = require('../src/services/piiService');
const { analizarPorClaves } = require('../src/services/keywordFallback');
const { evaluarFrustracion } = require('../src/services/frustrationRules');

let ok = 0;
let fail = 0;

function test(nombre, fn) {
  try {
    fn();
    ok++;
    console.log(`  PASS ${nombre}`);
  } catch (error) {
    fail++;
    console.log(`  FAIL ${nombre}: ${error.message}`);
  }
}

console.log('\n=== PRUEBAS UNITARIAS ===\n');

test('Calcula score crítico con frustración alta', () => {
  assert.equal(calcularPriorityScore({ severidad: 'Critica', scoreFrustracion: 1 }), 100);
});

test('Limita score al rango 0..100', () => {
  assert.equal(calcularPriorityScore({ severidad: 'Baja', scoreFrustracion: 99 }), 55);
  assert.equal(calcularPriorityScore({ severidad: 'Critica', scoreFrustracion: -1 }), 60);
});

test('Asigna etiqueta según umbral', () => {
  assert.equal(etiquetaPrioridad(20), 'Baja');
  assert.equal(etiquetaPrioridad(50), 'Media');
  assert.equal(etiquetaPrioridad(70), 'Alta');
  assert.equal(etiquetaPrioridad(90), 'Critica');
});

test('Anonimiza DNI, correo y credencial', () => {
  const salida = anonimizar('DNI 44236789, correo persona@empresa.com y clave es secreto123').texto;
  assert.equal(salida.includes('44236789'), false);
  assert.equal(salida.includes('persona@empresa.com'), false);
  assert.equal(salida.includes('secreto123'), false);
});

test('Anonimiza nombre introducido con frase indicadora', () => {
  const salida = anonimizar('Me llamo Carlos Mendoza y necesito ayuda').texto;
  assert.equal(salida.includes('Carlos'), false);
  assert.equal(salida.includes('Mendoza'), false);
});

test('Fallback clasifica una incidencia de red crítica y frustrada', () => {
  const resultado = analizarPorClaves('La VPN está caída, no puedo trabajar y estoy harto!!!');
  assert.equal(resultado.categoria, 'Redes');
  assert.equal(resultado.severidad, 'Critica');
  assert.equal(resultado.sentimiento, 'Frustrado');
  assert.ok(resultado.indicadores_frustracion.length >= 2);
});

test('Reglas heurísticas detectan señales explicables de frustración', () => {
  const resultado = evaluarFrustracion('Llevo horas esperando, nadie responde y no puedo trabajar!!!');
  assert.ok(resultado.score >= 0.7);
  assert.equal(resultado.impactoAlto, true);
  assert.ok(resultado.indicadores.includes('espera prolongada'));
});

console.log(`\n=== Resultado unitarias: ${ok} OK, ${fail} FAIL ===\n`);
process.exitCode = fail > 0 ? 1 : 0;
