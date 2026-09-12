// src/controller/exportacion.controller.js

const exportacionService = require('../helpers/exportacion.service');

async function exportar(req, res, next) {
  try {
    const { tipo, formato } = req.query;
    const { nombreArchivo, contentType, contenido } = await exportacionService.generarExportacion({ tipo, formato });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.status(200).send(contenido);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportar };
