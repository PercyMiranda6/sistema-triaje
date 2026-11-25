/**
 * Ejecutor de evidencias para sustentación académica.
 * No modifica la aplicación ni la base de datos: ejecuta procesos de prueba
 * y guarda un informe fechado en docs/evidencias/01-pruebas.
 *
 * Uso:
 *   node test/run-evidence.js
 *   node test/run-evidence.js --skip-system
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(backendDir, '..');
const evidenceDir = path.join(rootDir, 'docs', 'evidencias', '01-pruebas');
const timestamp = new Date();
const stamp = timestamp.toISOString().replace(/[:.]/g, '-');
const reportFile = path.join(evidenceDir, `reporte-pruebas-${stamp}.txt`);
const skipSystem = process.argv.includes('--skip-system');

fs.mkdirSync(evidenceDir, { recursive: true });

function run(nombre, command, args, cwd = backendDir) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 180000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`.trim();
  const timeout = result.error && result.error.code === 'ETIMEDOUT';
  const code = timeout ? 124 : (result.status ?? 1);
  const estado = code === 0 ? 'PASS' : 'FAIL';
  return { nombre, estado, code, ms: Date.now() - started, output };
}

function apiDisponible() {
  const result = spawnSync(process.execPath, ['-e', `fetch('${process.env.API_BASE || 'http://localhost:4000/api'}/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))`], {
    cwd: backendDir, timeout: 5000, stdio: 'ignore', shell: false,
  });
  return result.status === 0;
}

const resultados = [];
resultados.push(run('Unitarias: reglas de negocio, PII y fallback', process.execPath, ['test/unit.js']));

if (apiDisponible()) {
  resultados.push(run('Integración: flujo E2E de API, roles y persistencia', process.execPath, ['test/e2e.mjs']));
} else {
  resultados.push({ nombre: 'Integración: flujo E2E de API, roles y persistencia', estado: 'SKIP', code: 0, ms: 0, output: 'API no disponible en API_BASE. Levanta el backend y vuelve a ejecutar para obtener esta evidencia.' });
}

if (!skipSystem) {
  const npmCommand = process.platform === 'win32' ? process.env.ComSpec : 'npm';
  const npmArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', 'run', 'build'] : ['run', 'build'];
  resultados.push(run('Sistema: compilación de frontend', npmCommand, npmArgs, path.join(rootDir, 'frontend')));
  resultados.push(run('Sistema: sintaxis del servidor backend', process.execPath, ['--check', 'src/server.js']));
}

const pass = resultados.filter((r) => r.estado === 'PASS').length;
const fail = resultados.filter((r) => r.estado === 'FAIL').length;
const skip = resultados.filter((r) => r.estado === 'SKIP').length;
const lines = [
  'EVIDENCIA DE PRUEBAS - SISTEMA DE TRIAJE',
  `Fecha de ejecución: ${timestamp.toISOString()}`,
  `Node.js: ${process.version}`,
  `Directorio: ${rootDir}`,
  '',
  'RESUMEN',
  `PASS: ${pass} | FAIL: ${fail} | OMITIDAS: ${skip}`,
  '',
];

for (const r of resultados) {
  lines.push(`[${r.estado}] ${r.nombre} (${r.ms} ms)`);
  if (r.output) lines.push(r.output, '');
}

fs.writeFileSync(reportFile, `${lines.join('\n')}\n`, 'utf8');
console.log(lines.join('\n'));
console.log(`Archivo de evidencia: ${reportFile}`);
process.exitCode = fail > 0 ? 1 : 0;
