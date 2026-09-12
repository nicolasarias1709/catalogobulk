// src/utils/slug.js
// Genera un slug (minúsculas, sin tildes, sin espacios) a partir de un texto
// libre. Se usa en dos lugares que necesitan EXACTAMENTE la misma regla:
// helpers/categoria.service.js (crear categoría desde el panel) y
// workers/import.worker.js (crear proveedores en bloque desde un CSV, cuando
// el archivo no trae la columna "slug").

function generarSlug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = { generarSlug };
