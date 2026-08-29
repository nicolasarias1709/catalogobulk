// src/models/producto.model.js

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    nombre: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stock debe ser un entero',
      },
    },
    categoria: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
      lowercase: true,
      index: true,
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
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proveedor',
      required: true,
      index: true,
    },
    disponible: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// disponible siempre se deriva del stock, sin importar qué mande el cliente.
productoSchema.pre('validate', function derivarDisponible(next) {
  this.disponible = this.stock > 0;
  next();
});

module.exports = mongoose.model('Producto', productoSchema, 'productos');
