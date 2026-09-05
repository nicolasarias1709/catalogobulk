// src/controller/categoria.controller.js

const categoriaService = require('../helpers/categoria.service');

async function listar(req, res, next) {
  try {
    const categorias = await categoriaService.listarCategorias();
    res.status(200).json(categorias);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const categoria = await categoriaService.obtenerPorSlug(req.params.slug);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await categoriaService.actualizarCategoria(req.params.id, req.body);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, actualizar };
