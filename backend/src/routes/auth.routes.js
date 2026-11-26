const express = require('express');
const { registrar, login, perfil } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');
const { limitarLogin } = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/registrar', registrar);
router.post('/login', limitarLogin, login);
router.get('/perfil', autenticar, perfil);

module.exports = router;
