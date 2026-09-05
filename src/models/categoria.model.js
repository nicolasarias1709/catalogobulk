// src/models/categoria.model.js

const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      default: null,
    },
    imagenUrl: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^https?:\/\/.+/.test(v),
        message: 'imagenUrl debe ser una URL http(s) válida',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Categoria', categoriaSchema, 'categorias');
