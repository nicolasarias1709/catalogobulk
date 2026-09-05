// src/controller/import.controller.js

const importService = require('../helpers/import.service');

async function crear(req, res, next) {
  try {
    const resultado = await importService.crearImport({
      usuarioId: req.usuario.id,
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
    const { page, limit } = req.query;
    const resultado = await importService.listarImports({ page, limit });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, obtener, listar };
