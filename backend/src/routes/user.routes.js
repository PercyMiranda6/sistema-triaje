const express = require('express');
const { listarAnalistas, listarClientes, crearAnalista, crearCliente, actualizarUsuario, desactivarAnalista } = require('../controllers/userController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

// Todos los autenticados pueden ver la lista de analistas (para asignar/reasignar)
router.get('/analistas', autenticar, listarAnalistas);
router.get('/clientes', autenticar, autorizar('administrador'), listarClientes);

// Solo admin gestiona analistas
router.post('/analistas', autenticar, autorizar('administrador'), crearAnalista);
router.post('/clientes', autenticar, autorizar('administrador'), crearCliente);
router.patch('/:id', autenticar, autorizar('administrador'), actualizarUsuario);
router.delete('/:id', autenticar, autorizar('administrador'), desactivarAnalista);
router.patch('/analistas/:id/desactivar', autenticar, autorizar('administrador'), desactivarAnalista);

module.exports = router;
