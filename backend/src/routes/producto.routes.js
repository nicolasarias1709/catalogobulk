// src/routes/producto.routes.js

const express = require('express');
const productoController = require('../controller/producto.controller');
const auth = require('../middlewares/auth');
const rol = require('../middlewares/rol');
const cachear = require('../middlewares/cache');

const router = express.Router();

/**
 * @openapi
 * /api/productos:
 *   get:
 *     tags: [Productos]
 *     summary: Lista productos paginados
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: categoria
 *         schema: { type: string }
 *       - in: query
 *         name: proveedor
 *         schema: { type: string }
 *       - in: query
 *         name: disponible
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Lista paginada de productos }
 */
router.get('/', auth, cachear, productoController.listar);

/**
 * @openapi
 * /api/productos/stats:
 *   get:
 *     tags: [Productos]
 *     summary: Estadísticas agregadas del catálogo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Totales, precio promedio y conteo por categoría }
 */
router.get('/stats', auth, cachear, productoController.stats);

/**
 * @openapi
 * /api/productos/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Obtiene un producto por id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Producto encontrado }
 *       404: { description: No existe }
 */
router.get('/:id', auth, productoController.obtener);

/**
 * @openapi
 * /api/productos:
 *   post:
 *     tags: [Productos]
 *     summary: Crea un producto (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Producto creado }
 *       409: { description: sku duplicado }
 *       404: { description: proveedorId no existe }
 */
router.post('/', auth, rol('admin'), productoController.crear);

/**
 * @openapi
 * /api/productos/{id}:
 *   put:
 *     tags: [Productos]
 *     summary: Actualiza un producto (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizado }
 *       404: { description: No existe }
 *       409: { description: sku duplicado }
 */
router.put('/:id', auth, rol('admin'), productoController.actualizar);

/**
 * @openapi
 * /api/productos/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Elimina un producto (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Eliminado }
 *       404: { description: No existe }
 */
router.delete('/:id', auth, rol('admin'), productoController.eliminar);

module.exports = router;
