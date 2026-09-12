// src/helpers/exportacion.service.js
// Módulo de EXPORTACIÓN: arma un archivo descargable (.csv o .xlsx) con los
// datos que YA existen en la base de datos. No es una importación (no se
// sube ningún archivo): es lo contrario, un volcado de lectura.
//
// "Importaciones" en el panel usa esto para que el admin pueda bajarse el
// catálogo completo de productos, proveedores o categorías, revisarlo o
// compartirlo, sin tener que armar nada a mano.

const XLSX = require('xlsx');

const Producto = require('../models/producto.model');
const Proveedor = require('../models/proveedor.model');
const Categoria = require('../models/categoria.model');
const AppError = require('../errors/AppError');

const TIPOS_VALIDOS = ['productos', 'proveedores', 'categorias'];
const FORMATOS_VALIDOS = ['csv', 'xlsx'];

// Columnas de salida por tipo, en el orden en el que se ven en el archivo.
const COLUMNAS = {
  productos: ['sku', 'nombre', 'categoria', 'proveedor', 'precio', 'stock', 'disponible', 'activo', 'descripcion', 'imagenUrl'],
  proveedores: ['nombre', 'slug', 'contactoEmail', 'logoUrl', 'activo'],
  categorias: ['slug', 'nombre', 'descripcion', 'imagenUrl', 'activo'],
};

async function obtenerFilasProductos() {
  // populate trae el nombre del proveedor: sin esto, la columna "proveedor"
  // solo tendría el id de Mongo, que no le dice nada a quien abre el archivo.
  const productos = await Producto.find().populate('proveedorId', 'nombre').lean();

  return productos.map((p) => ({
    sku: p.sku,
    nombre: p.nombre,
    categoria: p.categoria,
    proveedor: p.proveedorId?.nombre || '',
    precio: p.precio,
    stock: p.stock,
    disponible: p.disponible ? 'sí' : 'no',
    activo: p.activo ? 'sí' : 'no',
    descripcion: p.descripcion || '',
    imagenUrl: p.imagenUrl || '',
  }));
}

async function obtenerFilasProveedores() {
  const proveedores = await Proveedor.find().lean();

  return proveedores.map((p) => ({
    nombre: p.nombre,
    slug: p.slug,
    contactoEmail: p.contactoEmail || '',
    logoUrl: p.logoUrl || '',
    activo: p.activo ? 'sí' : 'no',
  }));
}

async function obtenerFilasCategorias() {
  const categorias = await Categoria.find().lean();

  return categorias.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    descripcion: c.descripcion || '',
    imagenUrl: c.imagenUrl || '',
    activo: c.activo ? 'sí' : 'no',
  }));
}

/** Escapa un valor para una celda CSV (comillas dobles si trae coma, comilla o salto de línea). */
function escaparCeldaCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function construirCsv(filas, columnas) {
  const lineas = [columnas.join(',')];
  filas.forEach((fila) => {
    lineas.push(columnas.map((col) => escaparCeldaCsv(fila[col])).join(','));
  });
  return lineas.join('\r\n');
}

function construirXlsx(filas, columnas, nombreHoja) {
  const hoja = XLSX.utils.json_to_sheet(filas, { header: columnas });
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Genera el archivo de exportación de un tipo de catálogo.
 * @returns {{ nombreArchivo: string, contentType: string, contenido: string|Buffer }}
 */
async function generarExportacion({ tipo, formato }) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError(400, 'tipo inválido. Usa productos, proveedores o categorias', 'VALIDACION');
  }
  const formatoFinal = FORMATOS_VALIDOS.includes(formato) ? formato : 'csv';

  let filas;
  if (tipo === 'productos') filas = await obtenerFilasProductos();
  else if (tipo === 'proveedores') filas = await obtenerFilasProveedores();
  else filas = await obtenerFilasCategorias();

  const columnas = COLUMNAS[tipo];
  const fecha = new Date().toISOString().slice(0, 10);

  if (formatoFinal === 'xlsx') {
    return {
      nombreArchivo: `${tipo}-${fecha}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: construirXlsx(filas, columnas, tipo),
    };
  }

  return {
    nombreArchivo: `${tipo}-${fecha}.csv`,
    contentType: 'text/csv; charset=utf-8',
    // \uFEFF (BOM): para que Excel en Windows detecte UTF-8 y no rompa
    // tildes/eñes al abrir el archivo directamente.
    contenido: `\uFEFF${construirCsv(filas, columnas)}`,
  };
}

module.exports = { generarExportacion };
