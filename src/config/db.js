// src/config/db.js
// Conexión a Mongo con reintentos. `depends_on` en docker-compose solo
// garantiza el ORDEN de arranque de los contenedores, no que Mongo ya
// esté aceptando conexiones. Si no reintentamos, el primer intento puede
// fallar en frío y tirar toda la app.

const mongoose = require('mongoose');
const env = require('./env');

const REINTENTOS_MAX = 10;
const ESPERA_MS = 3000;

async function conectarMongo(intento = 1) {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('[mongo] conectado');
  } catch (err) {
    if (intento >= REINTENTOS_MAX) {
      console.error(
        `[mongo] no se pudo conectar tras ${REINTENTOS_MAX} intentos:`,
        err.message
      );
      throw err;
    }
    console.warn(
      `[mongo] intento ${intento} falló (${err.message}), reintentando en ${
        ESPERA_MS / 1000
      }s...`
    );
    await new Promise((resolve) => setTimeout(resolve, ESPERA_MS));
    return conectarMongo(intento + 1);
  }
}

function estadoMongo() {
  // 1 = connected
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}

module.exports = { conectarMongo, estadoMongo };
