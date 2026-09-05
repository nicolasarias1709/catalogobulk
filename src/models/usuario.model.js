// src/models/usuario.model.js
// El PDF no le da módulo propio a Usuario, pero necesita vivir en algún
// archivo .model.js; lo dejamos junto a auth por cohesión.

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: true,
      select: false, // nunca se trae por defecto en los .find()
    },
    rol: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// Doble seguro: aunque alguien haga .select('+password') por error,
// toJSON/toObject nunca lo exponen hacia afuera.
usuarioSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('Usuario', usuarioSchema, 'usuarios');
