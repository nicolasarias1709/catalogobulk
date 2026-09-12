// src/sockets/index.js
// Fase 4: progreso en tiempo real. El worker (Fase 3) reporta avance
// llamando bullJob.updateProgress(porcentaje) — eso emite un evento
// "progress" en la cola de BullMQ. Aquí lo escuchamos con QueueEvents y lo
// reenviamos SOLO a los clientes suscritos a ese importJobId puntual
// (una "room" de Socket.io por importJobId), para no mandarle a todo el
// mundo el progreso de imports ajenos.

const { Server } = require('socket.io');
const { QueueEvents } = require('bullmq');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { redis } = require('../config/redis');
const ImportJob = require('../models/importJob.model');

function inicializarSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // Mismo JWT que usa la API: el socket se autentica una vez, al conectar.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autenticado'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.usuario = { id: payload.sub, rol: payload.rol };
      return next();
    } catch (err) {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('import:suscribirse', (importJobId) => {
      if (typeof importJobId === 'string') socket.join(importJobId);
    });
    socket.on('import:desuscribirse', (importJobId) => {
      if (typeof importJobId === 'string') socket.leave(importJobId);
    });
  });

  // BullMQ identifica los jobs con su propio id (bullJobId), no con el
  // importJobId de Mongo — hay que mapear uno a otro.
  async function idImportPorBullJob(bullJobId) {
    const job = await ImportJob.findOne({ bullJobId }).select('_id');
    return job ? job._id.toString() : null;
  }

  const queueEvents = new QueueEvents('imports', { connection: redis });

  // SIN ESTO, EL SERVIDOR SE CAE (era la causa real del crash al registrar/
  // loguear). QueueEvents abre POR DENTRO su propia conexión de Redis
  // (bullmq la duplica con .duplicate()), separada de la que ya tiene su
  // propio manejador en config/redis.js. Si esa conexión duplicada falla y
  // nadie escucha su 'error', Node mata el proceso entero — sin relación con
  // el request que esté en curso. Mismo criterio que en config/cache.js y
  // queues/import.queue.js: avisar una vez y seguir sin el progreso en vivo.
  let avisoQueueEventsMostrado = false;
  queueEvents.on('error', (err) => {
    if (avisoQueueEventsMostrado) return;
    avisoQueueEventsMostrado = true;
    console.warn(
      `[sockets] progreso de importaciones sin Redis (${err.message}). ` +
      'El resto de la API y los sockets de sesión siguen funcionando.'
    );
  });

  queueEvents.on('progress', async ({ jobId, data: porcentaje }) => {
    const importJobId = await idImportPorBullJob(jobId);
    if (!importJobId) return;
    io.to(importJobId).emit('import:progreso', { importJobId, porcentaje, estado: 'processing' });
  });

  queueEvents.on('completed', async ({ jobId }) => {
    const importJobId = await idImportPorBullJob(jobId);
    if (!importJobId) return;
    const job = await ImportJob.findById(importJobId);
    io.to(importJobId).emit('import:progreso', {
      importJobId,
      porcentaje: 100,
      estado: job ? job.estado : 'completed',
    });
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    const importJobId = await idImportPorBullJob(jobId);
    if (!importJobId) return;
    io.to(importJobId).emit('import:progreso', { importJobId, estado: 'failed', motivoFallo: failedReason });
  });

  return io;
}

module.exports = inicializarSockets;
