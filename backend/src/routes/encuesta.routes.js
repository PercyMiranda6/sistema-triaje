const express = require('express');
const {
  responderCsat,
  estadoCsat,
  metricasCsat,
  responderNps,
  metricasNps,
} = require('../controllers/encuestaController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

// --- CSAT ---
// Cliente verifica si puede responder CSAT para un ticket
router.get('/csat/estado/:ticketId', autenticar, estadoCsat);

// Cliente responde CSAT (una vez por ticket cerrado/resuelto)
router.post('/csat', autenticar, responderCsat);

// Métricas CSAT (solo analista/administrador)
router.get('/csat/metricas', autenticar, autorizar('analista', 'administrador'), metricasCsat);

// --- NPS ---
// Cliente responde NPS
router.post('/nps', autenticar, responderNps);

// Métricas NPS (solo analista/administrador)
router.get('/nps/metricas', autenticar, autorizar('analista', 'administrador'), metricasNps);

module.exports = router;
