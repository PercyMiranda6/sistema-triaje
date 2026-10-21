const express = require('express');
const { resumen, exportar } = require('../controllers/dashboardController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

// Dashboard analítico de métricas (RF08)
router.get('/resumen', autenticar, autorizar('analista', 'administrador'), resumen);
router.get('/exportar', autenticar, autorizar('administrador'), exportar);

module.exports = router;