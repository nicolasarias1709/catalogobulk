// src/config/cache.js
// Cache de lectura para las consultas pesadas (GET /api/productos y /stats,
// sección 1.2 / 7.2). Usa el mismo cliente `redis` compartido. Si Redis
// falla por lo que sea, la cache NUNCA debe tumbar la petición: se degrada
// a "sin cache" en silencio, porque cachear es una optimización, no una
// dependencia dura del sistema.

const { redis } = require('./redis');
const env = require('./env');

const PREFIJO = 'cache:productos:';

async function obtenerCache(key) {
  try {
    const valor = await redis.get(PREFIJO + key);
    return valor ? JSON.parse(valor) : null;
  } catch (err) {
    return null;
  }
}

async function guardarCache(key, valor) {
  try {
    await redis.set(PREFIJO + key, JSON.stringify(valor), 'EX', env.CACHE_TTL_SECONDS);
  } catch (err) {
    // silencioso a propósito
  }
}

// Se llama cuando un import termina (worker, Fase 3): los productos cambiaron,
// así que cualquier respuesta cacheada de /api/productos y /stats quedó vieja.
async function invalidarCacheProductos() {
  try {
    const keys = await redis.keys(`${PREFIJO}*`);
    if (keys.length > 0) await redis.del(keys);
  } catch (err) {
    // silencioso a propósito
  }
}

module.exports = { obtenerCache, guardarCache, invalidarCacheProductos };
