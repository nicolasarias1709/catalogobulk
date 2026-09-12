// src/helpers/categoria.service.js

const categoriaRepo = require('../repositories/categoria.repository');
const AppError = require('../errors/AppError');

/**
 * Lista categorías. Igual que en productos: solo un admin autenticado que
 * pida explícitamente incluirInactivos=true ve también las desactivadas
 * (para poder reactivarlas). Cualquier otro caso solo ve las activas.
 */
function listarCategorias({ incluirInactivos, usuario } = {}) {
  const esAdmin = usuario?.rol === 'admin';
  const filtro = esAdmin && incluirInactivos === 'true' ? {} : { activo: true };
  return categoriaRepo.listarTodas(filtro);
}

async function obtenerPorSlug(slug, usuario) {
  const categoria = await categoriaRepo.buscarPorSlug(slug);
  if (!categoria) {
    throw new AppError(404, 'Categoría no encontrada', 'NO_ENCONTRADO');
  }

  const esAdmin = usuario?.rol === 'admin';
  if (!categoria.activo && !esAdmin) {
    throw new AppError(404, 'Categoría no encontrada', 'NO_ENCONTRADO');
  }

  return categoria;
}

/**
 * Crea una categoría desde cero (antes solo se creaban solas al importar
 * un catálogo, vía upsertPorSlug). El admin ahora puede crearlas a mano,
 * por ejemplo para armar primero el árbol de categorías y luego los
 * productos que van a usarlas.
 */
async function crearCategoria(data) {
  if (!data.slug || typeof data.slug !== 'string' || !data.slug.trim()) {
    throw new AppError(400, 'El slug es obligatorio', 'VALIDACION');
  }

  const existente = await categoriaRepo.buscarPorSlug(data.slug);
  if (existente) {
    throw new AppError(409, 'slug duplicado', 'SLUG_DUPLICADO');
  }
  return categoriaRepo.crear(data);
}

async function actualizarCategoria(id, data) {
  // el slug es la llave que une con productos: nunca se edita
  const { slug, ...permitidos } = data;
  const actualizada = await categoriaRepo.actualizar(id, permitidos);
  if (!actualizada) {
    throw new AppError(404, 'Categoría no encontrada', 'NO_ENCONTRADO');
  }
  return actualizada;
}

module.exports = { listarCategorias, obtenerPorSlug, crearCategoria, actualizarCategoria };
