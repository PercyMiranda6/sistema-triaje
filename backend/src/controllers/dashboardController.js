const { pool } = require('../config/db');

exports.resumen = async (req, res) => {
  const [totales] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(estado IN ('nuevo','asignado','en_proceso')) AS abiertos,
       SUM(estado IN ('resuelto','cerrado')) AS resueltos,
       SUM(estado = 'nuevo') AS nuevos,
       SUM(severidad = 'Critica' AND estado NOT IN ('resuelto','cerrado')) AS criticos_abiertos
       FROM tickets`
  );

  const [frt] = await pool.query(
    `SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, creado_el, primer_respuesta_el)), 1) AS frt_minutos
       FROM tickets
      WHERE primer_respuesta_el IS NOT NULL`
  );

  const [mttr] = await pool.query(
    `SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, creado_el, resuelto_el)), 2) AS mttr_horas,
            ROUND(AVG(TIMESTAMPDIFF(MINUTE, creado_el, resuelto_el)), 1) AS mttr_minutos
       FROM tickets
      WHERE resuelto_el IS NOT NULL`
  );

  const [sla] = await pool.query(
    `SELECT
       COUNT(*) AS total_resueltos,
       SUM(TIMESTAMPDIFF(HOUR, creado_el, resuelto_el) <= sla_horas) AS dentro_sla,
       ROUND(100 * SUM(TIMESTAMPDIFF(HOUR, creado_el, resuelto_el) <= sla_horas) / NULLIF(COUNT(*), 0), 1) AS pct_cumplimiento
       FROM tickets
      WHERE resuelto_el IS NOT NULL`
  );

  const [sentimiento] = await pool.query(
    `SELECT sentimiento, COUNT(*) AS cantidad
       FROM tickets WHERE sentimiento IS NOT NULL
      GROUP BY sentimiento`
  );

  const [estado] = await pool.query(
    `SELECT estado, COUNT(*) AS cantidad
       FROM tickets
      GROUP BY estado`
  );

  const [severidad] = await pool.query(
    `SELECT severidad, COUNT(*) AS cantidad
       FROM tickets WHERE severidad IS NOT NULL
      GROUP BY severidad`
  );

  const [categoria] = await pool.query(
    `SELECT categoria, COUNT(*) AS cantidad
       FROM tickets WHERE categoria IS NOT NULL
      GROUP BY categoria`
  );

  // Tickets por día (últimos 7 días)
  const [por_dia] = await pool.query(
    `SELECT DATE(creado_el) AS fecha, COUNT(*) AS cantidad
       FROM tickets
      WHERE creado_el >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(creado_el) ORDER BY fecha ASC`
  );

  const [analistas] = await pool.query(
    `SELECT a.nombre, a.especialidad, a.email,
            COUNT(t.id) AS asignados,
            SUM(t.estado IN ('resuelto','cerrado')) AS resueltos
       FROM usuarios a
       LEFT JOIN tickets t ON t.analista_id = a.id
      WHERE a.rol = 'analista'
      GROUP BY a.id, a.nombre, a.especialidad, a.email
      ORDER BY resueltos DESC`
  );

  return res.json({
    totales: totales[0],
    frt_minutos: frt[0].frt_minutos || 0,
    mttr: mttr[0].mttr_minutos || 0,
    sla: sla[0].total_resueltos > 0 ? sla[0] : { total_resueltos: 0, dentro_sla: 0, pct_cumplimiento: null },
    sentimiento,
    estado,
    severidad,
    categoria,
    por_dia,
    analistas,
  });
};

exports.exportar = async (req, res) => {
  const [filas] = await pool.query(
    `SELECT t.codigo, t.asunto, t.categoria, t.severidad, t.sentimiento,
            t.priority_score, t.estado, t.creado_el, t.resuelto_el,
            u.nombre AS cliente, a.nombre AS analista,
            TIMESTAMPDIFF(HOUR, t.creado_el, t.resuelto_el) AS horas_resolucion
       FROM tickets t
       LEFT JOIN usuarios u ON u.id = t.cliente_id
       LEFT JOIN usuarios a ON a.id = t.analista_id
      ORDER BY t.creado_el DESC`
  );

  return res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    .setHeader('Content-Disposition', 'attachment; filename="reporte_tickets.csv"')
    .send(toCsv(filas));
};

function toCsv(filas) {
  if (filas.length === 0) return 'sin datos';
  const claves = Object.keys(filas[0]);
  const encabezado = claves.map(escapeCsv).join(';');
  const cuerpo = filas.map((f) => claves.map((k) => escapeCsv(f[k])).join(';'));
  return [encabezado, ...cuerpo].join('\r\n');
}

function escapeCsv(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}