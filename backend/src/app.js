// src/app.js
// Construye y configura la app Express. NO hace listen() aquí: eso vive
// en server.js, para poder testear la app (Supertest) sin levantar un
// puerto real.

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { estadoMongo } = require('./config/db');
const { estadoRedis } = require('./config/redis');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');

function crearApp() {
  const app = express();

  // 'cors' ya estaba en package.json pero no se usaba en ningún lado: sin
  // este middleware, el navegador bloquea (por CORS) las peticiones que el
  // frontend (Vite, http://localhost:5173) hace a esta API. origin: '*' es
  // el mismo criterio permisivo que ya usa src/sockets/index.js.
  app.use(cors());

  app.use(express.json());

  // GET /health -> 200 si Mongo y Redis están arriba, 503 si alguno cayó
  app.get('/health', (req, res) => {
    const mongo = estadoMongo();
    const redis = estadoRedis();
    const todoOk = mongo === 'up' && redis === 'up';

    res.status(todoOk ? 200 : 503).json({
      status: todoOk ? 'ok' : 'degraded',
      mongo,
      redis,
    });
  });

  // Documentación interactiva
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // --- Rutas de módulos ---
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/productos', require('./routes/producto.routes'));
  app.use('/api/proveedores', require('./routes/proveedor.routes'));
  app.use('/api/categorias', require('./routes/categoria.routes'));
  app.use('/api/imports', require('./routes/import.routes'));

  // 404 para rutas no definidas
  app.use((req, res) => {
    res.status(404).json({
      error: { codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada' },
    });
  });

  // Manejador de errores centralizado: SIEMPRE al final
  app.use(errorHandler);

  return app;
}

module.exports = crearApp;
