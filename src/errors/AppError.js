// src/errors/AppError.js
// Error tipado para poder distinguir errores "esperados" (409 sku duplicado,
// 404 no existe, 400 validación) de errores inesperados (bugs, 500).

class AppError extends Error {
  constructor(statusCode, mensaje, codigo = 'ERROR') {
    super(mensaje);
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.isOperational = true; // marca "esto lo previmos, no es un crash"

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
