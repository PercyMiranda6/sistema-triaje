const express = require('express');
const {
  crearTicket,
  listarTickets,
  obtenerTicket,
  actualizarEstado,
  reasignar,
  reabrirTicket,
} = require('../controllers/ticketController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

// Cliente registra ticket; analistas y admin también pueden en pruebas.
router.post('/', autenticar, crearTicket);

// Listado por rol (cliente ve los suyos, analista los suyos, admin todos)
router.get('/', autenticar, listarTickets);

// Detalle
router.get('/:id', autenticar, obtenerTicket);

// El cliente puede solicitar la reapertura de un ticket resuelto o cerrado.
router.post('/:id/reabrir', autenticar, reabrirTicket);

// Cambio de estado (analista/admin)
router.patch('/:id/estado', autenticar, autorizar('analista', 'administrador'), actualizarEstado);

// Reasignación manual por falsos positivos (RF07) - admin
router.post('/:id/reasignar', autenticar, autorizar('administrador'), reasignar);

module.exports = router;
