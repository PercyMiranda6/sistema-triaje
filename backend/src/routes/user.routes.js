const express = require('express');
const { listarAnalistas, crearAnalista, desactivarAnalista } = require('../controllers/userController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

// Todos los autenticados pueden ver la lista de analistas (para asignar/reasignar)
router.get('/analistas', autenticar, listarAnalistas);

// Solo admin gestiona analistas
router.post('/analistas', autenticar, autorizar('administrador'), crearAnalista);
router.patch('/analistas/:id/desactivar', autenticar, autorizar('administrador'), desactivarAnalista);

module.exports = router;