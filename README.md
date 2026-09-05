# CatalogoBulk — Backend

API REST en Node + Express + MongoDB, con Redis/BullMQ para importaciones
masivas. Para el detalle de las fases de desarrollo originales, ver
[`EXPLICACION-FASES-2-5.md`](./EXPLICACION-FASES-2-5.md).

## Arranque

```bash
npm install
cp .env.example .env      # si no existe, ver variables abajo
npm run dev                # http://localhost:3000
```

Revisa `http://localhost:3000/health`: `mongo` debe decir `"up"`.

## Variables de entorno (`.env`)

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/catalogobulk
REDIS_URL=redis://localhost:6379
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=1h
MAX_FILE_SIZE_MB=50
BATCH_SIZE=500
CACHE_TTL_SECONDS=300
IMPORT_ERRORS_CAP=1000
```

Redis es **opcional** para desarrollo: el login y el CRUD de Mongo no
dependen de él. Solo hace falta real para la caché de productos y las
importaciones masivas (ver historial de cambios abajo).

## Crear el primer usuario

No hay seed. `POST /api/auth/register` no pide token:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@catalogobulk.com","password":"secreta123","rol":"admin"}'
```

## Estructura

```
src/
├── controller/     lógica de cada endpoint
├── models/         esquemas de Mongoose
├── routes/         definición de rutas + permisos por rol
├── helpers/        capa de servicio (reglas de negocio)
├── repositories/    acceso a datos (consultas a Mongo)
├── middlewares/     auth, rol, cache, upload, rateLimit, errorHandler
├── queues/          cola de importaciones (BullMQ)
├── workers/          consumidor de la cola (proceso aparte: npm run worker)
├── sockets/          progreso de importación en tiempo real (socket.io)
├── config/           env, db, redis, cache, swagger
└── scripts/          utilidades de línea de comandos
```

Reestructurado desde una organización por módulo (`modules/auth/`,
`modules/productos/`...) a esta organización por tipo de responsabilidad.

## Historial de cambios aplicados

1. **`src/app.js`** — se agregó `app.use(cors())`. Sin este middleware, el
   navegador bloquea las peticiones del frontend (puerto 5173) a esta API
   (puerto 3000), aunque el backend esté corriendo bien.

2. **`src/config/redis.js`** — el `retryStrategy` deja de reintentar tras 3
   intentos fallidos, y el error se avisa una sola vez por consola (antes
   repetía el mismo error sin parar). Esto permite desarrollar sin tener
   Redis instalado.

3. **`src/queues/import.queue.js`** y **`src/sockets/index.js`** — se les
   agregó `.on('error', ...)`. Sin esto, un fallo de conexión a Redis hacía
   que **todo el proceso de Node se cayera** (BullMQ re-emite los errores de
   conexión como su propio evento `'error'`, y en Node un `'error'` sin quien
   lo escuche mata el proceso).

4. **`src/workers/import.worker.js`** — mismo `.on('error', ...)` agregado
   de forma preventiva, para cuando se use `npm run worker`.
