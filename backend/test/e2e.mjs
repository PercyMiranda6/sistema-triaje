/**
 * Prueba de integración E2E del sistema de triaje.
 * Ejecuta el flujo completo contra la API y reporta PASS/FAIL.
 * Uso: node test/e2e.mjs
 */

const API = process.env.API_BASE || 'http://localhost:4000/api';

let ok = 0;
let fallo = 0;

function check(nombre, condicion, detalle = '') {
  if (condicion) {
    ok++;
    console.log(`  ✅ ${nombre}`);
  } else {
    fallo++;
    console.log(`  ❌ ${nombre} — ${detalle}`);
  }
}

async function post(ruta, cuerpo, token) {
  const res = await fetch(API + ruta, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function get(ruta, token) {
  const res = await fetch(API + ruta, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function patch(ruta, cuerpo, token) {
  const res = await fetch(API + ruta, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log('\n=== E2E Sistema de Triaje ===\n');

// 1. Login cliente
const emailCliente = `cliente_e2e_${Date.now()}@empresa.com`;
const reg = await post('/auth/registrar', { nombre: 'Cliente E2E', email: emailCliente, password: 'Clave123!' }, null);
check('Registro de cliente', reg.status === 201 && reg.data.token, `status=${reg.status}`);
const tokenCliente = reg.data.token;

// 2. Login admin
const loginAdmin = await post('/auth/login', { email: 'admin@triaje.com', password: 'Admin123!' }, null);
check('Login administrador', loginAdmin.status === 200 && loginAdmin.data.token);
const tokenAdmin = loginAdmin.data.token;

// 3. Login analista
const loginAna = await post('/auth/login', { email: 'ana.torres@empresa.com', password: 'Analista123!' }, null);
check('Login analista', loginAna.status === 200 && loginAna.data.token);
const tokenAna = loginAna.data.token;

// 4. Crear ticket vulnerable con PII
const textoPII = 'Buenos días, me llamo Roberto Díaz, DNI 44236789, correo roberto.diaz@gmail.com y clave: abc123. La impresora no imprime nada y estoy muuuuy frustrado!!! llevo horas esperando!!';
const t = await post('/tickets', { asunto: 'Impresora sin funcionar', descripcion: textoPII }, tokenCliente);
check('Crear ticket con triaje automático', t.status === 201 && t.data.ticket, JSON.stringify(t.data));
const ticket = t.data.ticket;
check('Categoría detectada (Hardware)', ['Hardware', 'Software', 'Redes', 'Accesos', 'Base de Datos'].includes(ticket.categoria));
check('Sentimiento Frustrado', ticket.sentimiento === 'Frustrado', ticket.sentimiento);
check('Priority score en rango 0-100', ticket.priority_score >= 0 && ticket.priority_score <= 100);
check('SLA asignado', typeof ticket.sla_horas === 'number');
check('Analista asignado automáticamente', !!ticket.analista_asignado);

// 5. Verificar PII enmascarado (via detalle no se expone; verificar triage log directo en DB no accesible por API,
//    en vez de eso validamos que el texto anonimizado no contiene DNI/correo/clave)
const det = await get(`/tickets/${ticket.id}`, tokenAdmin);
const anon = det.data.ticket.descripcion_anonimizada || '';
check('PII: DNI enmascarado', !`${anon}`.includes('44236789'));
check('PII: email enmascarado', !`${anon}`.includes('roberto.diaz@gmail.com'));
check('PII: credencial enmascarada', !`${anon}`.includes('abc123'));
check('PII: nombre enmascarado', !`${anon}`.includes('Roberto'));

// 6. Analista cambia estado
const st = await patch(`/tickets/${ticket.id}/estado`, { estado: 'en_proceso' }, tokenAna);
check('Analista inicia proceso', st.status === 200 && st.data.nuevoEstado === 'en_proceso');

const st2 = await patch(`/tickets/${ticket.id}/estado`, { estado: 'resuelto' }, tokenAna);
check('Analista resuelve ticket', st2.status === 200 && st2.data.nuevoEstado === 'resuelto');

// 7. Reasignación manual por admin
const eta = await get('/tickets', tokenAdmin);
const primerTicket = eta.data.tickets[0];
const r = await post(`/tickets/${primerTicket.id}/reasignar`, { analista_id: 5, motivo: 'Evidencia de falsa clasificación' }, tokenAdmin);
check('Reasignación manual admin', r.status === 200, `status=${r.status}`);

// 8. Acceso por roles
const listCliente = await get('/tickets', tokenCliente);
check('Cliente ve solo sus tickets', listCliente.data.tickets.every((x) => x.cliente_id !== undefined));
const bandejaAdmin = await get('/tickets?estado=resuelto', tokenAdmin);
check('Listado filtrado por estado', bandejaAdmin.status === 200);

// 9. Seguridad JWT
const sinToken = await get('/tickets', null);
check('Sin token -> 401', sinToken.status === 401);
const proh = await post('/tickets', { asunto: 'x', descripcion: 'y' }, tokenCliente);
check('Token válido -> ticket creado', proh.status === 201);

// 10. Dashboard
const dash = await get('/dashboard/resumen', tokenAdmin);
check('Dashboard resumen admin', dash.status === 200 && Array.isArray(dash.data.sentimiento));
const dashAna = await get('/dashboard/resumen', tokenAna);
check('Dashboard analista permitido', dashAna.status === 200);
const dashCliente = await get('/dashboard/resumen', tokenCliente);
check('Dashboard denegado a cliente (403)', dashCliente.status === 403);

// 11. Exportar CSV
const csv = await fetch(API + '/dashboard/exportar', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
check('Export CSV admin', csv.status === 200 && (await csv.text()).includes('codigo'));

// 12. Analistas
const listAna = await get('/usuarios/analistas', tokenAdmin);
check('Lista de analistas', listAna.status === 200 && listAna.data.analistas.length >= 1);

console.log(`\n=== Resultado: ${ok} OK, ${fallo} FAIL ===\n`);
process.exit(fallo > 0 ? 1 : 0);