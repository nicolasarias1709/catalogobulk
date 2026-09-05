// src/config/swagger.js

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CatálogoBulk API',
      version: '1.0.0',
      description:
        'Sistema de importación masiva de productos con procesamiento asíncrono',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Escanea los comentarios @openapi en todas las rutas de los módulos
  apis: ['./src/routes/*.routes.js'],
};

module.exports = swaggerJsdoc(options);
