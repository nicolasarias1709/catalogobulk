// src/helpers/proveedor.service.js

const proveedorRepo = require('../repositories/proveedor.repository');
const productoRepo = require('../repositories/producto.repository');
const AppError = require('../errors/AppError');

async function crearProveedor(data) {
  const [porSlug, porNombre] = await Promise.all([
    proveedorRepo.buscarPorSlug(data.slug),
    proveedorRepo.buscarPorNombre(data.nombre),
  ]);
  if (porSlug || porNombre) {
    throw new AppError(409, 'nombre o slug duplicado', 'DUPLICADO');
  }
  return proveedorRepo.crear(data);
}

async function listarProveedores({ page = 1, limit = 20, activo }) {
  const limitFinal = Math.min(parseInt(limit, 10) || 20, 100);
  const pageFinal = Math.max(parseInt(page, 10) || 1, 1);

  const filtro = {};
  if (activo !== undefined) filtro.activo = activo === 'true';

  const [data, total] = await proveedorRepo.listar({ filtro, page: pageFinal, limit: limitFinal });
  return { data, page: pageFinal, limit: limitFinal, total };
}

async function obtenerProveedor(id) {
  const proveedor = await proveedorRepo.buscarPorId(id);
  if (!proveedor) {
    throw new AppError(404, 'Proveedor no encontrado', 'NO_ENCONTRADO');
  }
  return proveedor;
}

async function actualizarProveedor(id, data) {
  const actualizado = await proveedorRepo.actualizar(id, data);
  if (!actualizado) {
    throw new AppError(404, 'Proveedor no encontrado', 'NO_ENCONTRADO');
  }
  return actualizado;
}

async function eliminarProveedor(id) {
  const tieneProductos = await productoRepo.contarPorProveedor(id);
  if (tieneProductos > 0) {
    throw new AppError(
      409,
      'No se puede eliminar: tiene productos asociados. Usa activo: false en su lugar',
      'INTEGRIDAD_REFERENCIAL'
    );
  }

  const eliminado = await proveedorRepo.eliminar(id);
  if (!eliminado) {
    throw new AppError(404, 'Proveedor no encontrado', 'NO_ENCONTRADO');
  }
}

module.exports = {
  crearProveedor,
  listarProveedores,
  obtenerProveedor,
  actualizarProveedor,
  eliminarProveedor,
};
