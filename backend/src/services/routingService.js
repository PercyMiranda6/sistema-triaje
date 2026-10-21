/**
 * Enrutamiento Inteligente (RF06).
 * Asigna el ticket al analista idóneo según:
 *  1. Especialidad que coincida con la categoría del triaje.
 *  2. Menor carga de trabajo activa.
 */

const { pool } = require('../config/db');

async function buscarAnalistaIdoneo(categoria) {
  const [disponibles] = await pool.query(
    `SELECT u.id, u.nombre, u.email,
            (SELECT COUNT(*) FROM tickets t
              WHERE t.analista_id = u.id
                AND t.estado IN ('asignado','en_proceso','nuevo')) AS carga
       FROM usuarios u
      WHERE u.rol = 'analista' AND u.activo = 1
      ORDER BY (u.especialidad = ?) DESC, carga ASC, u.id ASC
      LIMIT 1`,
    [categoria]
  );

  // Filtro estricto de especialidad: si hay alguien de la categoría con carga < N, priorizarlo
  const [especialistas] = await pool.query(
    `SELECT u.id, u.nombre, u.email,
            (SELECT COUNT(*) FROM tickets t
              WHERE t.analista_id = u.id
                AND t.estado IN ('asignado','en_proceso','nuevo')) AS carga
       FROM usuarios u
      WHERE u.rol = 'analista' AND u.activo = 1 AND u.especialidad = ?
      ORDER BY carga ASC, u.id ASC
      LIMIT 1`,
    [categoria]
  );

  if (especialistas.length > 0 && especialistas[0].carga < 5) {
    return especialistas[0];
  }
  return disponibles[0] || null;
}

module.exports = { buscarAnalistaIdoneo };