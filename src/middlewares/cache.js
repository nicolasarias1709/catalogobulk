// src/middlewares/cache.js
// Cachea la respuesta JSON completa de una ruta GET, usando la URL con su
// query string como key (así ?categoria=ropa y ?categoria=hogar no chocan).
// Se usa solo en las rutas "pesadas" que el contrato marca como
// cacheables: GET /api/productos y GET /api/productos/stats.

const { obtenerCache, guardarCache } = require('../config/cache');

function cachearRespuesta(req, res, next) {
  // IMPORTANTE: el rol entra en la clave. GET /productos?incluirInactivos=true
  // solo lo honra el servicio si quien pregunta es admin (ver
  // helpers/producto.service.js), pero esa revisión pasa DESPUÉS de este
  // middleware. Sin el rol en la key, la respuesta que le cacheamos a un
  // admin (con productos inactivos incluidos) se le podría servir tal cual,
  // desde caché, a cualquier visitante público que pruebe la misma URL a
  // mano — sin pasar nunca por esa revisión. Este middleware corre después
  // de authOpcional en la ruta, así que req.usuario ya existe si hay token.
  const key = `${req.originalUrl}::${req.usuario?.rol || 'anon'}`;

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
