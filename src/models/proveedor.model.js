// src/models/proveedor.model.js

const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'slug debe ser minúsculas sin espacios (ej: acme-corp)'],
    },
    contactoEmail: {
      type: String,
      default: null,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'contactoEmail inválido'],
    },
    logoUrl: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^https?:\/\/.+/.test(v),
        message: 'logoUrl debe ser una URL http(s) válida',
      },
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proveedor', proveedorSchema, 'proveedores');
