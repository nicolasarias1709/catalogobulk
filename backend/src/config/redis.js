// src/config/redis.js
// Cliente Redis compartido. Se usa para: caché de consultas (Fase 5) y
// como conexión para BullMQ (Fase 3-4). Un solo cliente ioredis reutilizable.
//
// Se conecta usando una URL completa (REDIS_URL), que sirve tanto para un
// Redis local (redis://localhost:6379) como para un Redis en la nube tipo
// Upstash (rediss://... con TLS).

const Redis = require('ioredis');
const env = require('./env');

const esTLS = env.REDIS_URL.startsWith('rediss://');

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // requerido por BullMQ
  retryStrategy(times) {
    // Si en 3 intentos no logró conectar, deja de insistir: en desarrollo,
    // Redis es OPCIONAL (solo lo usan la caché de /api/productos y la cola
    // de importaciones masivas — el login y el CRUD normal pasan por Mongo).
    // Devolver null le dice a ioredis "ríndete", en vez de reintentar para
    // siempre y llenar la consola de errores.
    if (times > 3) return null;
    return Math.min(times * 200, 3000);
  },
  ...(esTLS ? { tls: {} } : {}),
});

redis.on('connect', () => console.log('[redis] conectado'));

// Se avisa UNA sola vez que Redis no está disponible (en vez de repetir el
// mismo error en cada reintento) y se explica qué se pierde por no tenerlo.
let avisoRedisMostrado = false;
redis.on('error', (err) => {
  if (avisoRedisMostrado) return;
  avisoRedisMostrado = true;
  console.warn(
    `[redis] no se pudo conectar (${err.message}). ` +
    'Esto es normal si no tienes Redis instalado: el login y el CRUD ' +
    'de Mongo funcionan igual. Solo se desactivan la caché de productos ' +
    'y las importaciones masivas hasta que REDIS_URL apunte a un Redis real.'
  );
});

function estadoRedis() {
  // ioredis expone .status: 'connect' | 'ready' | 'close' | ...
  return redis.status === 'ready' ? 'up' : 'down';
}

module.exports = { redis, estadoRedis };
