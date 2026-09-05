// src/middlewares/upload.js
// Multer con diskStorage: guarda el archivo del proveedor en /uploads antes
// de que el worker lo procese (Fase 3). El límite de tamaño sale de
// MAX_FILE_SIZE_MB para no hardcodear nada (sección 3 del contrato).

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const nombreSeguro = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${nombreSeguro}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.csv' && ext !== '.json') {
    // Se traduce a AppError en las rutas (import.routes.js), aquí solo se marca.
    return cb(new Error('EXTENSION_INVALIDA'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
