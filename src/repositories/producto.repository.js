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

// ANTES esto usaba Producto.findByIdAndUpdate(...), pero ese método NUNCA
// dispara el hook `pre('validate')` del modelo (el que recalcula
// `disponible` a partir del stock) — ese hook es de DOCUMENTO, y solo se
// ejecuta con `.save()` o `.create()`. findByIdAndUpdate es una operación de
// CONSULTA directa contra Mongo: por eso, al editar el stock de un producto,
// `disponible` se quedaba con el valor viejo (era el bug reportado).
//
// La solución: buscar el documento, asignarle los cambios y guardarlo con
// `.save()`, para que el hook sí se dispare, igual que al crear.
async function actualizar(id, data) {
  const producto = await Producto.findById(id);
  if (!producto) return null;

  Object.assign(producto, data);
  // validateModifiedOnly: solo valida los campos que de verdad cambiaron,
  // para que una edición parcial (ej. solo mandar { activo: false }) no
  // vuelva a exigir sku/precio/proveedorId como si fuera una creación nueva.
  await producto.save({ validateModifiedOnly: true });
  return producto;
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
