const { pool } = require('./db');

/**
 * Aplica cambios pequeños y seguros para instalaciones existentes.
 * El esquema principal conserva la misma columna para instalaciones nuevas.
 */
async function ejecutarMigraciones() {
  const [columnas] = await pool.query(
    `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tickets'
        AND COLUMN_NAME = 'comentario_resolucion'`
  );

  if (columnas.length === 0) {
    await pool.query(
      `ALTER TABLE tickets
       ADD COLUMN comentario_resolucion TEXT NULL AFTER cerrado_el`
    );
    console.log('[DB] Migración aplicada: comentario de resolución.');
  }
}

module.exports = { ejecutarMigraciones };
