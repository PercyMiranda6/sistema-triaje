-- Evidencia: volcado de datos reales de la base de datos del sistema de triaje
-- Generado con: mysql -h 127.0.0.1 -u root sistema_triaje < 03-datos/consulta-evidencia.sql
SELECT '=== 1. TOTALES GENERALES ===' AS bloque;
SELECT COUNT(*) AS total_tickets,
       SUM(estado = 'nuevo') AS nuevos,
       SUM(estado = 'asignado') AS asignados,
       SUM(estado = 'en_proceso') AS en_proceso,
       SUM(estado = 'resuelto') AS resueltos,
       SUM(estado = 'cerrado') AS cerrados
  FROM tickets;

SELECT '=== 2. DISTRIBUCION POR CATEGORIA (variable de triaje) ===' AS bloque;
SELECT categoria, COUNT(*) AS tickets, ROUND(AVG(priority_score), 1) AS priority_promedio
  FROM tickets WHERE categoria IS NOT NULL GROUP BY categoria ORDER BY tickets DESC;

SELECT '=== 3. DISTRIBUCION POR SEVERIDAD ===' AS bloque;
SELECT severidad, COUNT(*) AS tickets, ROUND(AVG(priority_score), 1) AS priority_promedio
  FROM tickets WHERE severidad IS NOT NULL GROUP BY severidad
  ORDER BY FIELD(severidad, 'Critica', 'Alta', 'Media', 'Baja');

SELECT '=== 4. DISTRIBUCION POR SENTIMIENTO (analisis de sentimiento) ===' AS bloque;
SELECT sentimiento, COUNT(*) AS tickets, ROUND(AVG(score_frustracion), 2) AS score_fraccion_promedio
  FROM tickets WHERE sentimiento IS NOT NULL GROUP BY sentimiento ORDER BY tickets DESC;

SELECT '=== 5. PROVEEDOR DE IA UTILIZADO POR TICKET ===' AS bloque;
SELECT l.proveedor, COUNT(*) AS triangulos, ROUND(AVG(l.latencia_ms), 0) AS latencia_promedio_ms,
       MAX(l.latencia_ms) AS latencia_maxima_ms
  FROM triage_logs l GROUP BY l.proveedor ORDER BY triangulos DESC;

SELECT '=== 6. LATENCIA DEL TRIAJE (RNF01 <= 3000 ms) ===' AS bloque;
SELECT COUNT(*) AS muestras,
       MIN(latencia_ms) AS min_ms, ROUND(AVG(latencia_ms), 0) AS promedio_ms,
       MAX(latencia_ms) AS max_ms,
       SUM(latencia_ms <= 3000) AS dentro_de_rnf01,
       ROUND(100 * SUM(latencia_ms <= 3000) / COUNT(*), 1) AS pct_cumplimiento_rnf01
  FROM triage_logs WHERE proveedor <> 'fallback_local' AND latencia_ms > 0;

SELECT '=== 7. PRIORIDAD: tickets ordenados por score (cola dinamica) ===' AS bloque;
SELECT t.codigo, t.categoria, t.severidad, t.sentimiento, t.priority_score, t.estado,
       u.nombre AS cliente, a.nombre AS analista
  FROM tickets t
  LEFT JOIN usuarios u ON u.id = t.cliente_id
  LEFT JOIN usuarios a ON a.id = t.analista_id
 ORDER BY t.priority_score DESC LIMIT 12;

SELECT '=== 8. EVIDENCIA DE ANONIMIZACION (Ley N. 29733) ===' AS bloque;
SELECT l.id AS log_id, l.texto_enviado AS texto_enviado_a_la_nube,
       (l.texto_enviado LIKE '%44236789%') AS contiene_dni,
       (l.texto_enviado LIKE '%@gmail.com%') AS contiene_email,
       (l.texto_enviado LIKE '%abc123%') AS contiene_credencial,
       (l.texto_enviado LIKE '%[NOMBRE]%') AS contiene_nombre_enmascarado
  FROM triage_logs l ORDER BY l.id DESC LIMIT 5;

SELECT '=== 9. BITACORA DE AUDITORIA ===' AS bloque;
SELECT id, usuario_id, accion, LEFT(detalle, 90) AS detalle, creado_el
  FROM auditoria ORDER BY id DESC LIMIT 12;

SELECT '=== 10. CARGA DE TRABAJO POR ANALISTA (enrutamiento inteligente) ===' AS bloque;
SELECT a.nombre, a.especialidad,
       COUNT(t.id) AS tickets_asignados,
       SUM(t.estado IN ('nuevo', 'asignado', 'en_proceso')) AS carga_activa
  FROM usuarios a
  LEFT JOIN tickets t ON t.analista_id = a.id
 WHERE a.rol = 'analista'
 GROUP BY a.id, a.nombre, a.especialidad
 ORDER BY carga_activa DESC;

SELECT '=== 11. SLA: TIEMPO OBJETIVO VS TIEMPO REAL ===' AS bloque;
SELECT codigo, severidad, sla_horas AS sla_objetivo_horas,
       TIMESTAMPDIFF(MINUTE, creado_el, resuelto_el) AS tiempo_real_min,
       CASE WHEN TIMESTAMPDIFF(HOUR, creado_el, resuelto_el) <= sla_horas THEN 'DENTRO DE SLA' ELSE 'INCUMPLIO' END AS cumplimiento
  FROM tickets WHERE resuelto_el IS NOT NULL ORDER BY creado_el DESC;
