// tests/jest.setup.js
// Se ejecuta ANTES de que se carguen los módulos de cada archivo de test.
// Objetivo: los tests nunca deben tocar la base de datos "real" (donde
// vive el catálogo de verdad). Le agregamos el sufijo _test al nombre de
// la base dentro de la MONGO_URI, así corren aislados en
// "catalogobulk_test" en vez de "catalogobulk". Mongo/Atlas crea esa base
// automáticamente al primer insert, no hay que hacer nada manual.

require('dotenv').config();

if (process.env.MONGO_URI && !/\/[^/?]+_test(\?|$)/.test(process.env.MONGO_URI)) {
  process.env.MONGO_URI = process.env.MONGO_URI.replace(
    /\/([^/?]+)(\?|$)/,
    '/$1_test$2'
  );
}
