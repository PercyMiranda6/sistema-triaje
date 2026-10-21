// Benchmark comparativo de modelos de Groq para el triaje (evidencia RNF01)
require('dotenv').config();
const { ejecutarTriaje } = require('../src/services/aiClient');

const MODELOS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

const CASOS = [
  {
    nombre: 'VPN no conecta (frustrado, PII)',
    asunto: 'La VPN no conecta desde el lunes',
    descripcion: 'Buenos dias, soy Roberto Diaz, mi DNI es 44236789, correo roberto.diaz@gmail.com y mi clave es abc123. Desde el lunes la VPN no conecta en mi laptop y no puedo trabajar con los reportes, me tiene harto, esto ya me hace un dia entero, nadie responde!!!',
  },
  {
    nombre: 'Impresora sin funcionar (hardware)',
    asunto: 'La impresora no imprime',
    descripcion: 'La impresora de la oficina no imprime nada desde ayer, muestra una luz roja parpadeante. Adjunto la foto de la pantalla.',
  },
  {
    nombre: 'Consulta de reporte (neutro, baja)',
    asunto: 'Consulta sobre reporte mensual',
    descripcion: 'Buen dia, quisiera saber como puedo exportar el reporte mensual en formato Excel. Gracias.',
  },
  {
    nombre: 'Error critico de produccion (critica)',
    asunto: 'El sistema de produccion caido',
    descripcion: 'Urgente: todo el sistema de produccion esta caido y no podemos emitir facturas. Es una emergencia, se paro todo el proceso. Necesito ayuda urgente.',
  },
  {
    nombre: 'No puedo acceder a mi cuenta',
    asunto: 'No puedo entrar a mi cuenta',
    descripcion: 'Desde la manana no puedo iniciar sesion en el portal, me dice usuario bloqueado y no puedo trabajar con el sistema.',
  },
];

(async () => {
  const lineas = [];
  const cab = 'modelo | caso | proveedor | latencia_ms | categoria | severidad | sentimiento | score | priority';
  lineas.push(cab);
  lineas.push('-'.repeat(cab.length));

  const resumen = {};
  for (const modelo of MODELOS) {
    process.env.GROQ_MODEL = modelo;
    const filas = [];
    for (const c of CASOS) {
      const t = await ejecutarTriaje({ asunto: c.asunto, descripcion: c.descripcion });
      const r = t.resultado;
      const prio = Math.round(((Math.min(4, { Baja: 1, Media: 2, Alta: 3, Critica: 4 }[r.severidad]) / 4) * 0.6 + r.score_frustracion * 0.4) * 100);
      const fila = `${modelo} | ${c.nombre} | ${t.proveedor} | ${t.latenciaMs} | ${r.categoria} | ${r.severidad} | ${r.sentimiento} | ${r.score_frustracion} | ${prio}`;
      filas.push({ modelo, caso: c.nombre, lat: t.latenciaMs, prov: t.proveedor, r });
      lineas.push(fila);
    }
    const lats = filas.map((f) => f.lat).sort((a, b) => a - b);
    const p95 = lats[Math.min(lats.length - 1, Math.floor(lats.length * 0.95))];
    const avg = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
    const groqCalls = filas.filter((f) => f.prov === 'groq').length;
    resumen[modelo] = { avg, p95, max: lats[lats.length - 1], min: lats[0], groqCalls, total: filas.length };
    lineas.push('');
  }

  lineas.push('=== RESUMEN DE LATENCIA (ms) ===');
  for (const [m, s] of Object.entries(resumen)) {
    lineas.push(`${m}: min=${s.min} avg=${s.avg} p95=${s.p95} max=${s.max} | llamadas LLM exitosas: ${s.groqCalls}/${s.total} | cumple RNF01 (<=3000ms p95): ${s.p95 <= 3000 ? 'SI' : 'NO'}`);
  }

  console.log(lineas.join('\n'));
})();
