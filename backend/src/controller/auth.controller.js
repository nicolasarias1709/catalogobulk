// src/controller/auth.controller.js

const authService = require('../helpers/auth.service');
const AppError = require('../errors/AppError');

async function register(req, res, next) {
  try {
    const { email, password, rol } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'email y password son requeridos', 'VALIDACION');
    }

    const usuario = await authService.registrar({ email, password, rol });
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'email y password son requeridos', 'VALIDACION');
    }

    const resultado = await authService.login({ email, password });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
