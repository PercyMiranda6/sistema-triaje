require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./config/db');
const { noEncontrado, errorGlobal } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rutas
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const encuestaRoutes = require('./routes/encuesta.routes');

app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    return res.json({ estado: 'ok', baseDatos: 'conectado', hora: new Date().toISOString() });
  } catch {
    return res.status(503).json({ estado: 'error', baseDatos: 'sin conexión' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/encuestas', encuestaRoutes);

app.use(noEncontrado);
app.use(errorGlobal);

const PORT = process.env.PORT || 4000;

async function iniciar() {
  try {
    await testConnection();
    console.log('[DB] Conexión a MySQL establecida.');

    await require('./seed')();

    app.listen(PORT, () => {
      console.log(`[SERVER] Sistema de Triaje escuchando en http://localhost:${PORT}`);
      console.log(`[SERVER] Healthcheck: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[DB] Error al conectar a MySQL:', err.message);
    console.error('Verifica que MySQL/XAMPP esté corriendo y las credenciales en .env');
    process.exit(1);
  }
}

iniciar();