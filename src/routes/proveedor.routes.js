// src/routes/proveedor.routes.js

const express = require('express');
const proveedorController = require('../controller/proveedor.controller');
const auth = require('../middlewares/auth');
const rol = require('../middlewares/rol');

const router = express.Router();

/**
 * @openapi
 * /api/proveedores:
 *   get:
 *     tags: [Proveedores]
 *     summary: Lista proveedores paginados
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista paginada }
 */
router.get('/', auth, proveedorController.listar);

/**
 * @openapi
 * /api/proveedores/{id}:
 *   get:
 *     tags: [Proveedores]
 *     summary: Obtiene un proveedor por id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Proveedor encontrado }
 *       404: { description: No existe }
 */
router.get('/:id', auth, proveedorController.obtener);

/**
 * @openapi
 * /api/proveedores:
 *   post:
 *     tags: [Proveedores]
 *     summary: Crea un proveedor (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 *       409: { description: nombre o slug duplicado }
 */
router.post('/', auth, rol('admin'), proveedorController.crear);

/**
 * @openapi
 * /api/proveedores/{id}:
 *   put:
 *     tags: [Proveedores]
 *     summary: Actualiza un proveedor (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizado }
 *       404: { description: No existe }
 */
router.put('/:id', auth, rol('admin'), proveedorController.actualizar);

/**
 * @openapi
 * /api/proveedores/{id}:
 *   delete:
 *     tags: [Proveedores]
 *     summary: Elimina un proveedor si no tiene productos asociados (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Eliminado }
 *       404: { description: No existe }
 *       409: { description: Tiene productos asociados }
 */
router.delete('/:id', auth, rol('admin'), proveedorController.eliminar);

module.exports = router;
