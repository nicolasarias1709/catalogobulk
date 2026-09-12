// src/routes/exportacion.routes.js
// Descarga de archivos con los datos ACTUALES del catálogo (no sube nada:
// es lo contrario de un import). Se usa desde el panel -> "Importaciones".

const express = require('express');
const exportacionController = require('../controller/exportacion.controller');
const auth = require('../middlewares/auth');
const rol = require('../middlewares/rol');

const router = express.Router();

/**
 * @openapi
 * /api/exportaciones:
 *   get:
 *     tags: [Exportaciones]
 *     summary: Descarga productos, proveedores o categorías como archivo .csv o .xlsx (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         required: true
 *         schema: { type: string, enum: [productos, proveedores, categorias] }
 *       - in: query
 *         name: formato
 *         schema: { type: string, enum: [csv, xlsx], default: csv }
 *     responses:
 *       200: { description: Archivo descargable con todos los registros del tipo pedido }
 *       400: { description: tipo inválido }
 */
router.get('/', auth, rol('admin'), exportacionController.exportar);

module.exports = router;
