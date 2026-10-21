/**
 * Script de seed: crea usuarios base si no existen (idempotente).
 * Reproduce el flujo de la app usando el pool de la base de datos.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

const USUARIOS_BASE = [
  {
    nombre: 'Administrador del Sistema',
    email: () => process.env.SEED_ADMIN_EMAIL || 'admin@triaje.com',
    password: () => process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
    rol: 'administrador',
    especialidad: null,
  },
  {
    nombre: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    password: 'Cliente123!',
    rol: 'cliente',
    especialidad: null,
  },
  {
    nombre: 'Ana Torres',
    email: 'ana.torres@empresa.com',
    password: 'Analista123!',
    rol: 'analista',
    especialidad: 'Hardware',
  },
  {
    nombre: 'Carlos Ruiz',
    email: 'carlos.ruiz@empresa.com',
    password: 'Analista123!',
    rol: 'analista',
    especialidad: 'Software',
  },
  {
    nombre: 'María Gómez',
    email: 'maria.gomez@empresa.com',
    password: 'Analista123!',
    rol: 'analista',
    especialidad: 'Redes',
  },
  {
    nombre: 'Luis Fernández',
    email: 'luis.fernandez@empresa.com',
    password: 'Analista123!',
    rol: 'analista',
    especialidad: 'Accesos',
  },
  {
    nombre: 'Rosa Mendoza',
    email: 'rosa.mendoza@empresa.com',
    password: 'Analista123!',
    rol: 'analista',
    especialidad: 'Base de Datos',
  },
];

async function semillaUsuarios() {
  for (const u of USUARIOS_BASE) {
    const email = typeof u.email === 'function' ? u.email() : u.email;
    const password = typeof u.password === 'function' ? u.password() : u.password;
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), rol = VALUES(rol), especialidad = VALUES(especialidad)`,
      [u.nombre, email.toLowerCase().trim(), hash, u.rol, u.especialidad]
    );
  }
  console.log('[SEED] Usuarios base listos.');
}

module.exports = semillaUsuarios;