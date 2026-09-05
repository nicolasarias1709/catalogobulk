// src/repositories/categoria.repository.js

const Categoria = require('../models/categoria.model');

function listarTodas() {
  return Categoria.find().sort({ nombre: 1 });
}

function buscarPorSlug(slug) {
  return Categoria.findOne({ slug: slug.toLowerCase() });
}

function buscarPorId(id) {
  return Categoria.findById(id);
}

function actualizar(id, data) {
  return Categoria.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    context: 'query',
  });
}

// Usado por el import (Fase 3): crea la categoría si no existe.
function upsertPorSlug(slug) {
  return Categoria.findOneAndUpdate(
    { slug },
    {
      $setOnInsert: {
        slug,
        nombre: slug.charAt(0).toUpperCase() + slug.slice(1),
      },
    },
    { upsert: true, new: true }
  );
}

module.exports = { listarTodas, buscarPorSlug, buscarPorId, actualizar, upsertPorSlug };
