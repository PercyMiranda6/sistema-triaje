const { pool } = require('./db');

/**
 * Aplica cambios pequeños y seguros para instalaciones existentes.
 * El esquema principal conserva la misma columna para instalaciones nuevas.
 */
async function ejecutarMigraciones() {
  const columnasNuevas = [
    { nombre: 'comentario_resolucion', sql: 'ADD COLUMN comentario_resolucion TEXT NULL AFTER cerrado_el', mensaje: 'comentario de resolución' },
    { nombre: 'indicadores_frustracion', sql: 'ADD COLUMN indicadores_frustracion TEXT NULL AFTER comentario_resolucion', mensaje: 'indicadores de frustración' },
    { nombre: 'confianza_clasificacion', sql: 'ADD COLUMN confianza_clasificacion DECIMAL(3,2) NULL AFTER indicadores_frustracion', mensaje: 'confianza de clasificación' },
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

  const [tipoEstado] = await pool.query(
    `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tickets'
        AND COLUMN_NAME = 'estado'`
  );
  if (tipoEstado.length > 0 && !tipoEstado[0].COLUMN_TYPE.includes("'reabierto'")) {
    await pool.query(
      `ALTER TABLE tickets
       MODIFY COLUMN estado ENUM('nuevo','asignado','en_proceso','resuelto','cerrado','rechazado','reabierto') NOT NULL DEFAULT 'nuevo'`
    );
    console.log('[DB] Migración aplicada: estado reabierto.');
  }
}

module.exports = { ejecutarMigraciones };
