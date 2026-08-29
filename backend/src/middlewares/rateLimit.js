// src/middlewares/rateLimit.js
// Limitadores de tasa. login e imports piden "rate limit estricto" en el
// contrato (secciones 7.1 y 7.5).

const rateLimit = require('express-rate-limit');

// Login: pocos intentos, ventana corta -> mitiga fuerza bruta de contraseñas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      codigo: 'DEMASIADAS_SOLICITUDES',
      mensaje: 'Demasiados intentos de login, intenta más tarde',
    },
  },
});

// Imports: subir archivos es costoso (procesamiento en background),
// se limita para que no se sature la cola.
const importLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      codigo: 'DEMASIADAS_SOLICITUDES',
      mensaje: 'Demasiadas importaciones en poco tiempo, espera un momento',
    },
  },
});

module.exports = { loginLimiter, importLimiter };
