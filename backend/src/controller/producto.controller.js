// src/controller/producto.controller.js

const productoService = require('../helpers/producto.service');

async function crear(req, res, next) {
  try {
    const producto = await productoService.crearProducto(req.body);
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { page, limit, categoria, proveedor, disponible } = req.query;
    const resultado = await productoService.listarProductos({
      page,
      limit,
      categoria,
      proveedor,
      disponible,
    });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const producto = await productoService.obtenerProducto(req.params.id);
    res.status(200).json(producto);
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const resultado = await productoService.obtenerStats();
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const producto = await productoService.actualizarProducto(req.params.id, req.body);
    res.status(200).json(producto);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await productoService.eliminarProducto(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listar, obtener, stats, actualizar, eliminar };
