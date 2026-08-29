// src/helpers/auth.service.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const AppError = require('../errors/AppError');
const env = require('../config/env');

const SALT_ROUNDS = 10;

async function registrar({ email, password, rol }) {
  const existente = await Usuario.findOne({ email: email.toLowerCase() });
  if (existente) {
    throw new AppError(409, 'El email ya está registrado', 'EMAIL_DUPLICADO');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const usuario = await Usuario.create({
    email,
    password: passwordHash,
    rol: rol || 'user',
  });

  return { id: usuario._id, email: usuario.email, rol: usuario.rol };
}

async function login({ email, password }) {
  // select('+password') porque el schema lo excluye por defecto
  const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');

  if (!usuario) {
    throw new AppError(401, 'Credenciales inválidas', 'CREDENCIALES_INVALIDAS');
  }

  const passwordOk = await bcrypt.compare(password, usuario.password);
  if (!passwordOk) {
    throw new AppError(401, 'Credenciales inválidas', 'CREDENCIALES_INVALIDAS');
  }

  const token = jwt.sign({ sub: usuario._id.toString(), rol: usuario.rol }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { token };
}

module.exports = { registrar, login };
