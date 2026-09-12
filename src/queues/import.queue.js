// src/queues/import.queue.js
// Define la Queue de BullMQ para los imports. Reutiliza el mismo cliente
// Redis que la caché (config/redis.js) — mismo REDIS_URL, sirve tanto para
// Redis local como para Redis en la nube (Upstash, con TLS).
//
// POST /api/imports solo hace `.add()` aquí (encolar). El worker
// (src/workers/import.worker.js, Fase 3) es quien la consume — corre como
// proceso aparte para no bloquear el API.

const { Queue } = require('bullmq');
const { redis } = require('../config/redis');

const importQueue = new Queue('imports', { connection: redis });

// SIN ESTO, EL SERVIDOR SE CAE. BullMQ re-emite cualquier fallo de conexión
// de Redis como su PROPIO evento 'error' en la Queue (ver en la librería:
// node_modules/bullmq/dist/cjs/classes/queue-base.js). En Node, un evento
// 'error' sin ningún '.on(\'error\', ...)' escuchándolo no se ignora: hace
// que el proceso entero termine (throw), aunque ese fallo nada tenga que ver
// con el request que esté procesando el servidor en ese momento — por eso
// el registro/login parecía tumbar el backend sin relación aparente.
//
// Igual que en config/cache.js: encolar imports es una función más, no una
// dependencia dura del arranque. Se avisa una sola vez y se sigue.
let avisoQueueMostrado = false;
importQueue.on('error', (err) => {
  if (avisoQueueMostrado) return;
  avisoQueueMostrado = true;
  console.warn(
    `[queue:imports] no se pudo conectar a Redis (${err.message}). ` +
    'Las importaciones masivas (POST /api/imports) no van a funcionar ' +
    'hasta que REDIS_URL apunte a un Redis real. El resto de la API sigue igual.'
  );
});

module.exports = { importQueue };
