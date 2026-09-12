// api/index.js
//
// Entry point para Vercel. Vercel detecta automáticamente cualquier archivo
// dentro de /api como una función serverless. Este archivo NO hace
// httpServer.listen() (Vercel no soporta servidores persistentes) y NO
// inicializa Socket.io (necesita una conexión persistente que las funciones
// serverless no ofrecen).
//
// src/server.js (con listen() + sockets) sigue existiendo intacto para
// correr localmente o en un host con servidor persistente (Render, Railway,
// una VM propia, etc). Este archivo es exclusivo para el modelo serverless
// de Vercel.
//
// LIMITACIÓN IMPORTANTE (ver README.md, sección "Desplegar en Vercel"):
// el worker de BullMQ (src/workers/import.worker.js) que procesa las
// importaciones masivas NO puede correr dentro de una función serverless.
// Tiene que correr como un proceso aparte, siempre encendido, en otro lado
// (Render/Railway tienen un plan gratis para esto). Sin ese worker corriendo
// en algún sitio, los imports se quedan encolados en Redis para siempre.

const env = require('../src/config/env'); // valida .env en cada arranque en frío
const { conectarMongo, estadoMongo } = require('../src/config/db');
require('../src/config/redis'); // fuerza la conexión de redis al importarse
const crearApp = require('../src/app');

const app = crearApp();

// Las funciones serverless de Vercel reutilizan el mismo proceso ("arranque
// caliente") mientras haya tráfico seguido, así que conectamos a Mongo una
// sola vez por proceso, no en cada request.
let conexionMongoIniciada = null;

app.use((req, res, next) => {
  if (!conexionMongoIniciada) {
    conexionMongoIniciada = conectarMongo().catch((err) => {
      conexionMongoIniciada = null; // permite reintentar en el próximo request
      throw err;
    });
  }
  conexionMongoIniciada.then(() => next()).catch(next);
});

module.exports = app;
