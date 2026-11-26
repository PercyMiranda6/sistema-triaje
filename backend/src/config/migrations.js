const { pool } = require('./db');

/**
 * Aplica cambios pequeños y seguros para instalaciones existentes.
 * El esquema principal conserva la misma columna para instalaciones nuevas.
 */
async function ejecutarMigraciones() {
  const columnasNuevas = [
    { nombre: 'comentario_resolucion', sql: 'ADD COLUMN comentario_resolucion TEXT NULL AFTER cerrado_el', mensaje: 'comentario de resolución' },
    { nombre: 'indicadores_frustracion', sql: 'ADD COLUMN indicadores_frustracion TEXT NULL AFTER comentario_resolucion', mensaje: 'indicadores de frustración' },
  ];

  for (const columna of columnasNuevas) {
    const [existente] = await pool.query(
      `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'tickets'
          AND COLUMN_NAME = ?`,
      [columna.nombre]
    );

    if (existente.length === 0) {
      await pool.query(`ALTER TABLE tickets ${columna.sql}`);
      console.log(`[DB] Migración aplicada: ${columna.mensaje}.`);
    }
  }
}

module.exports = { ejecutarMigraciones };
