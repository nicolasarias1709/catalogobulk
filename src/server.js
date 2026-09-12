// src/server.js
// Punto de entrada real: conecta a Mongo, arranca Express + Socket.io.
// Separado de app.js para poder testear la app (Supertest) sin abrir un
// puerto real ni tocar sockets.

const http = require('http');
const env = require('./config/env'); // valida .env ANTES de todo lo demás
const crearApp = require('./app');
const { conectarMongo } = require('./config/db');
require('./config/redis'); // fuerza la conexión de redis al importarse
const inicializarSockets = require('./sockets/index');

async function main() {
  await conectarMongo();

  const app = crearApp();
  const httpServer = http.createServer(app);

  inicializarSockets(httpServer); // Fase 4: progreso en tiempo real

  httpServer.listen(env.PORT, () => {
    console.log(`[server] escuchando en el puerto ${env.PORT}`);
    console.log(`[server] Swagger en http://localhost:${env.PORT}/api/docs`);
  });
}

main().catch((err) => {
  console.error('[server] error fatal al arrancar:', err);
  process.exit(1);
});
