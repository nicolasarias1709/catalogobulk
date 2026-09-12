// src/controller/proveedor.controller.js

const proveedorService = require('../helpers/proveedor.service');

async function crear(req, res, next) {
  try {
    const proveedor = await proveedorService.crearProveedor(req.body);
    res.status(201).json(proveedor);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { page, limit, activo } = req.query;
    const resultado = await proveedorService.listarProveedores({ page, limit, activo });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const proveedor = await proveedorService.obtenerProveedor(req.params.id);
    res.status(200).json(proveedor);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const proveedor = await proveedorService.actualizarProveedor(req.params.id, req.body);
    res.status(200).json(proveedor);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await proveedorService.eliminarProveedor(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listar, obtener, actualizar, eliminar };
