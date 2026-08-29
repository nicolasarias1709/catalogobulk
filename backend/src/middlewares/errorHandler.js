// src/middlewares/errorHandler.js
// Último middleware de la cadena. Convierte cualquier error (tipado o no)
// en una respuesta JSON consistente.

const AppError = require('../errors/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Errores de duplicado de Mongo (índice único) -> 409
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({
      error: {
        codigo: 'DUPLICADO',
        mensaje: `Valor duplicado para ${campo}`,
      },
    });
  }

  // Errores de validación de Mongoose -> 400
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        codigo: 'VALIDACION',
        mensaje: err.message,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        codigo: err.codigo,
        mensaje: err.message,
      },
    });
  }

  // Error no previsto: lo logueamos completo pero no exponemos detalles internos
  console.error('[error no controlado]', err);
  return res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrió un error inesperado',
    },
  });
}

module.exports = errorHandler;
