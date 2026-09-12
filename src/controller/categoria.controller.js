// src/controller/categoria.controller.js

const categoriaService = require('../helpers/categoria.service');

async function listar(req, res, next) {
  try {
    const { incluirInactivos } = req.query;
    const categorias = await categoriaService.listarCategorias({
      incluirInactivos,
      usuario: req.usuario, // lo pone authOpcional; undefined si nadie inició sesión
    });
    res.status(200).json(categorias);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const categoria = await categoriaService.obtenerPorSlug(req.params.slug, req.usuario);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const categoria = await categoriaService.crearCategoria(req.body);
    res.status(201).json(categoria);
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

module.exports = { listar, obtener, crear, actualizar };
