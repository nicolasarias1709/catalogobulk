// src/helpers/categoria.service.js

const categoriaRepo = require('../repositories/categoria.repository');
const AppError = require('../errors/AppError');

function listarCategorias() {
  return categoriaRepo.listarTodas();
}

async function obtenerPorSlug(slug) {
  const categoria = await categoriaRepo.buscarPorSlug(slug);
  if (!categoria) {
    throw new AppError(404, 'Categoría no encontrada', 'NO_ENCONTRADO');
  }
  return categoria;
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

module.exports = { listarCategorias, obtenerPorSlug, actualizarCategoria };
