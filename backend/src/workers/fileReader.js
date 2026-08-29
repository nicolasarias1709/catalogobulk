// src/workers/fileReader.js
// Lee el archivo completo del proveedor (CSV o JSON) y lo convierte en un
// array de filas "crudas" (objetos planos, tal como vienen). NO valida
// reglas de negocio aquí (eso es rowProcessor.js) — solo sabe leer el
// formato. Si el archivo está corrupto o el header no trae las columnas
// obligatorias, lanza un error: eso es lo que el worker interpreta como
// "fallo irrecuperable del job" (estado failed, sección 5.5 del contrato).

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const COLUMNAS_OBLIGATORIAS = ['sku', 'nombre', 'precio', 'stock', 'categoria'];

function leerArchivoCatalogo(rutaArchivo) {
  const ext = path.extname(rutaArchivo).toLowerCase();
  const contenido = fs.readFileSync(rutaArchivo, 'utf-8');

  if (ext === '.json') {
    let datos;
    try {
      datos = JSON.parse(contenido);
    } catch (err) {
      throw new Error('El archivo JSON está corrupto o mal formado');
    }
    if (!Array.isArray(datos)) {
      throw new Error('El JSON debe ser un array de productos');
    }
    return datos;
  }

  if (ext === '.csv') {
    let registros;
    try {
      registros = parse(contenido, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      throw new Error('El archivo CSV está corrupto o mal formado');
    }

    if (registros.length > 0) {
      const columnas = Object.keys(registros[0]);
      const faltantes = COLUMNAS_OBLIGATORIAS.filter((c) => !columnas.includes(c));
      if (faltantes.length > 0) {
        throw new Error(`Header inválido, faltan columnas obligatorias: ${faltantes.join(', ')}`);
      }
    }

    return registros;
  }

  throw new Error('Extensión de archivo no soportada');
}

module.exports = { leerArchivoCatalogo };
