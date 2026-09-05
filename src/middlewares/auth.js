// src/middlewares/auth.js
// Verifica el JWT del header Authorization y adjunta req.usuario = { id, rol }.

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../errors/AppError');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token no provisto', 'NO_AUTENTICADO'));
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.usuario = { id: payload.sub, rol: payload.rol };
    next();
  } catch (err) {
    return next(new AppError(401, 'Token inválido o expirado', 'NO_AUTENTICADO'));
  }
}

module.exports = auth;
