// src/routes/import.routes.js

const express = require('express');
const multer = require('multer');
const importController = require('../controller/import.controller');
const auth = require('../middlewares/auth');
const rol = require('../middlewares/rol');
const upload = require('../middlewares/upload');
const { importLimiter } = require('../middlewares/rateLimit');
const AppError = require('../errors/AppError');

const router = express.Router();

// Envuelve multer para traducir sus errores (tamaño, extensión) al formato
// consistente de AppError, en vez de dejar que Express devuelva un 500 crudo.
function subirArchivo(req, res, next) {
  upload.single('archivo')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'El archivo excede el tamaño máximo permitido', 'ARCHIVO_MUY_GRANDE'));
    }
    if (err && err.message === 'EXTENSION_INVALIDA') {
      return next(new AppError(400, 'Extensión de archivo inválida. Solo .csv o .json', 'EXTENSION_INVALIDA'));
    }
    if (err) return next(err);
    return next();
  });
}

/**
 * @openapi
 * /api/imports:
 *   post:
 *     tags: [Imports]
 *     summary: Sube un catálogo (CSV/JSON) y lo encola para procesar (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo, proveedorId]
 *             properties:
 *               archivo: { type: string, format: binary }
 *               proveedorId: { type: string }
 *     responses:
 *       202: { description: Import encolado, no procesado todavía }
 *       400: { description: Sin archivo, extensión inválida o falta proveedorId }
 *       404: { description: proveedorId no existe }
 *       409: { description: Proveedor inactivo }
 *       413: { description: Archivo excede MAX_FILE_SIZE_MB }
 */
router.post('/', auth, rol('admin'), importLimiter, subirArchivo, importController.crear);

/**
 * @openapi
 * /api/imports:
 *   get:
 *     tags: [Imports]
 *     summary: Lista los import jobs paginados (solo admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista paginada de import jobs }
 */
router.get('/', auth, rol('admin'), importController.listar);

/**
 * @openapi
 * /api/imports/{id}:
 *   get:
 *     tags: [Imports]
 *     summary: Consulta el estado/progreso de un import (dueño o admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Estado y progreso del import }
 *       403: { description: No eres el dueño ni admin }
 *       404: { description: No existe }
 */
router.get('/:id', auth, importController.obtener);

module.exports = router;
