// src/middlewares/rol.js
// Exige que req.usuario.rol sea uno de los roles permitidos.
// Debe usarse SIEMPRE después de auth.js (necesita req.usuario ya seteado).

const AppError = require('../errors/AppError');

function rol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError(401, 'No autenticado', 'NO_AUTENTICADO'));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new AppError(403, 'No tienes permisos para esta acción', 'PROHIBIDO'));
    }
    next();
  };
}

module.exports = rol;
