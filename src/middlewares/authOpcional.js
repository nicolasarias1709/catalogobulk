// src/middlewares/authOpcional.js
// Igual que middlewares/auth.js, pero NUNCA bloquea la petición.
//
// Se usa en rutas PUBLICAS (catálogo) que igual quieren saber, cuando exista,
// quién está del otro lado — puntualmente, para que un admin logueado pueda
// pedir también los productos/categorías "activo: false" (para poder
// reactivarlos), mientras que un visitante anónimo (o un usuario común)
// nunca los ve. Ver helpers/producto.service.js y categoria.service.js,
// donde se revisa `req.usuario?.rol === 'admin'` antes de honrar
// `?incluirInactivos=true`.

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authOpcional(req, res, next) {
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.usuario = { id: payload.sub, rol: payload.rol };
    } catch (err) {
      // Token ausente, inválido o expirado: no es un error aquí. Sigue como
      // visitante anónimo — la ruta sigue siendo pública.
    }
  }

  next();
}

module.exports = authOpcional;
