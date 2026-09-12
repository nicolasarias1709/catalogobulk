// src/helpers/producto.service.js

const productoRepo = require('../repositories/producto.repository');
const proveedorRepo = require('../repositories/proveedor.repository');
const AppError = require('../errors/AppError');

async function crearProducto(data) {
  const proveedor = await proveedorRepo.buscarPorId(data.proveedorId);
  if (!proveedor) {
    throw new AppError(404, 'proveedorId no existe', 'PROVEEDOR_NO_ENCONTRADO');
  }

  const existente = await productoRepo.buscarPorSku(data.sku);
  if (existente) {
    throw new AppError(409, 'sku duplicado', 'SKU_DUPLICADO');
  }

  return productoRepo.crear(data);
}

async function listarProductos({ page = 1, limit = 20, categoria, proveedor, disponible, incluirInactivos, usuario }) {
  const limitFinal = Math.min(parseInt(limit, 10) || 20, 100);
  const pageFinal = Math.max(parseInt(page, 10) || 1, 1);

  const filtro = {};
  if (categoria) filtro.categoria = categoria.toLowerCase();
  if (disponible !== undefined) filtro.disponible = disponible === 'true';

  // Solo un admin autenticado puede pedir también los productos inactivos
  // (para poder reactivarlos desde el panel). Cualquier otro caso — catálogo
  // público, usuario normal, o admin que no lo pidió explícitamente — solo
  // ve los activos. Sin esto, cualquiera podría ver productos "borrados"
  // agregando el parámetro a mano en la URL.
  const esAdmin = usuario?.rol === 'admin';
  if (!(esAdmin && incluirInactivos === 'true')) {
    filtro.activo = true;
  }

  if (proveedor) {
    // proveedor puede venir como slug o como id
    const proveedorRepoModule = require('../repositories/proveedor.repository');
    const prov = await proveedorRepoModule.buscarPorSlugOId(proveedor);
    // Si no existe el proveedor, devolvemos filtro imposible en vez de error
    // (es un filtro de búsqueda, no una operación sobre el proveedor).
    filtro.proveedorId = prov ? prov._id : null;
  }

  const [data, total] = await productoRepo.listar({ filtro, page: pageFinal, limit: limitFinal });

  return { data, page: pageFinal, limit: limitFinal, total };
}

async function obtenerProducto(id, usuario) {
  const producto = await productoRepo.buscarPorId(id);
  if (!producto) {
    throw new AppError(404, 'Producto no encontrado', 'NO_ENCONTRADO');
  }

  const esAdmin = usuario?.rol === 'admin';
  if (!producto.activo && !esAdmin) {
    // Se responde igual que "no existe": no hay razón para confirmarle a un
    // visitante que un producto inactivo existe pero está oculto.
    throw new AppError(404, 'Producto no encontrado', 'NO_ENCONTRADO');
  }

  return producto;
}

async function obtenerStats() {
  const [resumen] = await productoRepo.agregarStats();
  const porCategoria = await productoRepo.agregarPorCategoria();

  return {
    totalProductos: resumen ? resumen.totalProductos : 0,
    precioPromedio: resumen ? Math.round(resumen.precioPromedio * 100) / 100 : 0,
    porCategoria,
  };
}

async function actualizarProducto(id, data) {
  if (data.sku) {
    const existente = await productoRepo.buscarPorSku(data.sku);
    if (existente && existente._id.toString() !== id) {
      throw new AppError(409, 'sku duplicado', 'SKU_DUPLICADO');
    }
  }

  const actualizado = await productoRepo.actualizar(id, data);
  if (!actualizado) {
    throw new AppError(404, 'Producto no encontrado', 'NO_ENCONTRADO');
  }
  return actualizado;
}

async function eliminarProducto(id) {
  const eliminado = await productoRepo.eliminar(id);
  if (!eliminado) {
    throw new AppError(404, 'Producto no encontrado', 'NO_ENCONTRADO');
  }
}

module.exports = {
  crearProducto,
  listarProductos,
  obtenerProducto,
  obtenerStats,
  actualizarProducto,
  eliminarProducto,
};
