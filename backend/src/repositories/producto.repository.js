// src/repositories/producto.repository.js
// El repository nunca sabe de req/res, solo habla con Mongoose.

const Producto = require('../models/producto.model');

function crear(data) {
  return Producto.create(data);
}

function buscarPorId(id) {
  return Producto.findById(id);
}

function buscarPorSku(sku) {
  return Producto.findOne({ sku: sku.toUpperCase() });
}

function listar({ filtro, page, limit }) {
  const skip = (page - 1) * limit;
  return Promise.all([
    Producto.find(filtro).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Producto.countDocuments(filtro),
  ]);
}

function actualizar(id, data) {
  return Producto.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    context: 'query',
  });
}

function eliminar(id) {
  return Producto.findByIdAndDelete(id);
}

function contarPorProveedor(proveedorId) {
  return Producto.countDocuments({ proveedorId });
}

function agregarStats() {
  return Producto.aggregate([
    {
      $group: {
        _id: null,
        totalProductos: { $sum: 1 },
        precioPromedio: { $avg: '$precio' },
      },
    },
  ]);
}

function agregarPorCategoria() {
  return Producto.aggregate([
    { $group: { _id: '$categoria', count: { $sum: 1 } } },
    { $project: { _id: 0, categoria: '$_id', count: 1 } },
    { $sort: { count: -1 } },
  ]);
}

module.exports = {
  crear,
  buscarPorId,
  buscarPorSku,
  listar,
  actualizar,
  eliminar,
  contarPorProveedor,
  agregarStats,
  agregarPorCategoria,
};
