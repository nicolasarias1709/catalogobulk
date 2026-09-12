// src/routes/categoria.routes.js

const express = require('express');
const categoriaController = require('../controller/categoria.controller');
const auth = require('../middlewares/auth');
const authOpcional = require('../middlewares/authOpcional');
const rol = require('../middlewares/rol');

const router = express.Router();

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Lista todas las categorías (sin paginar, catálogo público sin login)
 *     parameters:
 *       - in: query
 *         name: incluirInactivos
 *         schema: { type: boolean }
 *         description: Solo tiene efecto si quien pregunta es admin autenticado.
 *     responses:
 *       200: { description: Lista de categorías }
 */
// Sin "auth" (no exige login), pero con "authOpcional": si viene un token
// válido de admin, se entera (req.usuario), sin bloquear a quien no manda
// ninguno. El catálogo público usa esta lista para armar el filtro por
// categoría, y el panel de admin la reutiliza pidiendo también las inactivas.
router.get('/', authOpcional, categoriaController.listar);

/**
 * @openapi
 * /api/categorias/{slug}:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtiene una categoría por slug (catálogo público, sin login)
 *     responses:
 *       200: { description: Categoría encontrada }
 *       404: { description: No existe }
 */
router.get('/:slug', authOpcional, categoriaController.obtener);

/**
 * @openapi
 * /api/categorias:
 *   post:
 *     tags: [Categorías]
 *     summary: Crea una categoría (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Categoría creada }
 *       409: { description: slug duplicado }
 */
router.post('/', auth, rol('admin'), categoriaController.crear);

/**
 * @openapi
 * /api/categorias/{id}:
 *   put:
 *     tags: [Categorías]
 *     summary: Enriquece una categoría (nombre, descripcion, imagenUrl, activo) — solo admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizada }
 *       404: { description: No existe }
 */
router.put('/:id', auth, rol('admin'), categoriaController.actualizar);

module.exports = router;
