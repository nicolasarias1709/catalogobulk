// src/models/importJob.model.js
// Fuente de verdad del estado de una importación. Los endpoints que lo usan
// (POST/GET /api/imports) se construyen en Fase 2-4; el modelo entra ya en
// Fase 1 porque la sección 5 pide los 5 modelos desde el principio.

const mongoose = require('mongoose');

const errorImportSchema = new mongoose.Schema(
  {
    fila: { type: Number, required: true },
    sku: { type: String, default: null },
    motivo: { type: String, required: true },
  },
  { _id: false }
);

// Un renglón por cada fila procesada del archivo (éxito o error). Es lo que
// alimenta el reporte descargable (GET /api/imports/:id/reporte.csv) — con
// "errores" sola no se podía armar un reporte completo, porque no guardaba
// las filas que SÍ se importaron bien.
const resultadoImportSchema = new mongoose.Schema(
  {
    fila: { type: Number, required: true },
    identificador: { type: String, default: null }, // sku (productos) o nombre (proveedores/categorías)
    estado: { type: String, enum: ['ok', 'error'], required: true },
    motivo: { type: String, default: null },
  },
  { _id: false }
);

const importJobSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    // Qué se está importando. "productos" es el valor histórico (el único
    // que existía antes de agregar el módulo de Importaciones al panel).
    tipo: {
      type: String,
      enum: ['productos', 'proveedores', 'categorias'],
      default: 'productos',
    },
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proveedor',
      // Solo los productos importados necesitan un proveedor dueño: un
      // catálogo de proveedores o de categorías no pertenece a ninguno.
      required: function proveedorRequeridoSoloParaProductos() {
        return this.tipo === 'productos';
      },
      default: null,
    },
    archivoNombre: {
      type: String,
      required: true,
    },
    archivoRuta: {
      type: String,
      required: true,
    },
    estado: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    total: {
      type: Number,
      default: null,
    },
    procesados: {
      type: Number,
      default: 0,
    },
    exitosos: {
      type: Number,
      default: 0,
    },
    fallidos: {
      type: Number,
      default: 0,
    },
    errores: {
      type: [errorImportSchema],
      default: [],
    },
    resultados: {
      type: [resultadoImportSchema],
      default: [],
    },
    bullJobId: {
      type: String,
      default: null,
    },
    motivoFallo: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImportJob', importJobSchema, 'import_jobs');
