// src/routes/auth.routes.js

const express = require('express');
const authController = require('../controller/auth.controller');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@demo.com }
 *               password: { type: string, example: secreta123 }
 *               rol: { type: string, enum: [admin, user], example: admin }
 *     responses:
 *       201: { description: Usuario creado }
 *       409: { description: Email ya registrado }
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión y devuelve un JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login exitoso, devuelve token }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', loginLimiter, authController.login);

module.exports = router;
