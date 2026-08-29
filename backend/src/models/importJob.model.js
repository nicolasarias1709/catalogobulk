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

const importJobSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proveedor',
      required: true,
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
