// src/middlewares/cache.js
// Cachea la respuesta JSON completa de una ruta GET, usando la URL con su
// query string como key (así ?categoria=ropa y ?categoria=hogar no chocan).
// Se usa solo en las rutas "pesadas" que el contrato marca como
// cacheables: GET /api/productos y GET /api/productos/stats.

const { obtenerCache, guardarCache } = require('../config/cache');

function cachearRespuesta(req, res, next) {
  const key = req.originalUrl;

  obtenerCache(key).then((cacheado) => {
    if (cacheado) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cacheado);
    }

    res.set('X-Cache', 'MISS');
    const jsonOriginal = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) guardarCache(key, body); // no bloqueante
      return jsonOriginal(body);
    };
    return next();
  });
}

module.exports = cachearRespuesta;
