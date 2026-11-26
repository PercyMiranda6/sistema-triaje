/**
 * Script de seed: crea usuarios base si no existen (idempotente).
 * Reproduce el flujo de la app usando el pool de la base de datos.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

const USUARIOS_BASE = [
  {
    nombre: 'Administrador del Sistema',
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    rol: 'administrador',
    especialidad: null,
  },
  {
    nombre: 'Juan Pérez',
    email: process.env.SEED_CLIENTE_EMAIL,
    password: process.env.SEED_CLIENTE_PASSWORD,
    rol: 'cliente',
    especialidad: null,
  },
  {
    nombre: 'Ana Torres',
    email: process.env.SEED_ANA_EMAIL,
    password: process.env.SEED_ANA_PASSWORD,
    rol: 'analista',
    especialidad: 'Hardware',
  },
  {
    nombre: 'Carlos Ruiz',
    email: process.env.SEED_CARLOS_EMAIL,
    password: process.env.SEED_CARLOS_PASSWORD,
    rol: 'analista',
    especialidad: 'Software',
  },
  {
    nombre: 'María Gómez',
    email: process.env.SEED_MARIA_EMAIL,
    password: process.env.SEED_MARIA_PASSWORD,
    rol: 'analista',
    especialidad: 'Redes',
  },
  {
    nombre: 'Luis Fernández',
    email: process.env.SEED_LUIS_EMAIL,
    password: process.env.SEED_LUIS_PASSWORD,
    rol: 'analista',
    especialidad: 'Accesos',
  },
  {
    nombre: 'Rosa Mendoza',
    email: process.env.SEED_ROSA_EMAIL,
    password: process.env.SEED_ROSA_PASSWORD,
    rol: 'analista',
    especialidad: 'Base de Datos',
  },
];

async function semillaUsuarios() {
  const configurados = USUARIOS_BASE.filter((u) => u.email && u.password);
  for (const u of configurados) {
    const email = u.email;
    const password = u.password;
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), rol = VALUES(rol), especialidad = VALUES(especialidad)`,
      [u.nombre, email.toLowerCase().trim(), hash, u.rol, u.especialidad]
    );
  }
  console.log(`[SEED] ${configurados.length} usuarios configurados.`);
}

module.exports = semillaUsuarios;
