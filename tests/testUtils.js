// tests/testUtils.js
// Utilidades compartidas: conectar/limpiar/cerrar Mongo y Redis entre tests,
// y crear usuarios de prueba con su token ya listo.

const mongoose = require('mongoose');
require('../src/config/env'); // valida .env también en modo test
const { redis } = require('../src/config/redis');
const authService = require('../src/helpers/auth.service');
const Usuario = require('../src/models/usuario.model');

async function limpiarBaseDeDatos() {
  const colecciones = mongoose.connection.collections;
  for (const key in colecciones) {
    await colecciones[key].deleteMany({});
  }
}

async function cerrarConexiones() {
  await mongoose.connection.close();
  redis.disconnect();
}

async function crearUsuarioConToken({ email, password = 'secreta123', rol = 'user' }) {
  await authService.registrar({ email, password, rol });
  const { token } = await authService.login({ email, password });
  return token;
}

module.exports = { limpiarBaseDeDatos, cerrarConexiones, crearUsuarioConToken, Usuario };
