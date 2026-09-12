// src/config/env.js
// Lee y valida las variables de entorno. Si falta alguna, el proceso muere
// de inmediato con un mensaje claro. Esto evita fallos raros a mitad de
// ejecución (ej: que el import se rompa porque JWT_SECRET no existía).

require('dotenv').config();

const REQUIRED_VARS = [
  'PORT',
  'MONGO_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'MAX_FILE_SIZE_MB',
  'BATCH_SIZE',
  'CACHE_TTL_SECONDS',
  'IMPORT_ERRORS_CAP',
];

function validarEnv() {
  const faltantes = REQUIRED_VARS.filter((key) => {
    const valor = process.env[key];
    return valor === undefined || valor === '';
  });

  if (faltantes.length > 0) {
    // Fallar temprano: si el proceso arranca sin esto, cualquier feature
    // que dependa de estas variables va a fallar de forma impredecible.
    console.error(
      `[env] Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`
    );
    process.exit(1);
  }
}

validarEnv();

const env = {
  PORT: parseInt(process.env.PORT, 10),
  MONGO_URI: process.env.MONGO_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE, 10),
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS, 10),
  IMPORT_ERRORS_CAP: parseInt(process.env.IMPORT_ERRORS_CAP, 10),
};

module.exports = env;
