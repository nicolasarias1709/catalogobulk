// src/repositories/proveedor.repository.js

const mongoose = require('mongoose');
const Proveedor = require('../models/proveedor.model');

function crear(data) {
  return Proveedor.create(data);
}

function buscarPorId(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Proveedor.findById(id);
}

function buscarPorSlug(slug) {
  return Proveedor.findOne({ slug: slug.toLowerCase() });
}

function buscarPorNombre(nombre) {
  return Proveedor.findOne({ nombre });
}

// Se usa en el filtro de productos (?proveedor=slug-o-id) y en el import.
async function buscarPorSlugOId(valor) {
  if (mongoose.isValidObjectId(valor)) {
    const porId = await Proveedor.findById(valor);
    if (porId) return porId;
  }
  return Proveedor.findOne({ slug: valor.toLowerCase() });
}

function listar({ filtro, page, limit }) {
  const skip = (page - 1) * limit;
  return Promise.all([
    Proveedor.find(filtro).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Proveedor.countDocuments(filtro),
  ]);
}

function actualizar(id, data) {
  return Proveedor.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    context: 'query',
  });
}

function eliminar(id) {
  return Proveedor.findByIdAndDelete(id);
}

module.exports = {
  crear,
  buscarPorId,
  buscarPorSlug,
  buscarPorNombre,
  buscarPorSlugOId,
  listar,
  actualizar,
  eliminar,
};
