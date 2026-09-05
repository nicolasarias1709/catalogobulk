// src/routes/categoria.routes.js

const express = require('express');
const categoriaController = require('../controller/categoria.controller');
const auth = require('../middlewares/auth');
const rol = require('../middlewares/rol');

const router = express.Router();

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Lista todas las categorías (sin paginar)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de categorías }
 */
router.get('/', auth, categoriaController.listar);

/**
 * @openapi
 * /api/categorias/{slug}:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtiene una categoría por slug
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Categoría encontrada }
 *       404: { description: No existe }
 */
router.get('/:slug', auth, categoriaController.obtener);

/**
 * @openapi
 * /api/categorias/{id}:
 *   put:
 *     tags: [Categorías]
 *     summary: Enriquece una categoría (nombre, descripcion, imagenUrl) — solo admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizada }
 *       404: { description: No existe }
 */
router.put('/:id', auth, rol('admin'), categoriaController.actualizar);

module.exports = router;
