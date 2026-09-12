// src/controller/import.controller.js

const importService = require('../helpers/import.service');

async function crear(req, res, next) {
  try {
    const resultado = await importService.crearImport({
      usuarioId: req.usuario.id,
      tipo: req.body.tipo,
      proveedorId: req.body.proveedorId,
      archivo: req.file,
    });
    res.status(202).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const resultado = await importService.obtenerImport(req.params.id, req.usuario);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { page, limit, tipo } = req.query;
    const resultado = await importService.listarImports({ page, limit, tipo });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

/**
 * Descarga el reporte de una importación ya terminada como archivo .csv:
 * una fila por cada renglón del archivo original, con si se importó bien o
 * el motivo del error. El BOM ("\uFEFF") al inicio es para que Excel en
 * Windows detecte UTF-8 y no rompa las tildes/eñes al abrirlo.
 */
async function descargarReporte(req, res, next) {
  try {
    const { nombreArchivo, contenido } = await importService.generarReporteCsv(req.params.id, req.usuario);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.status(200).send(`\uFEFF${contenido}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, obtener, listar, descargarReporte };
