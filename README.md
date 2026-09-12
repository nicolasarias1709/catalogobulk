# CatalogoBulk — Backend

API REST en Node + Express + MongoDB, con Redis/BullMQ para importaciones
masivas. Para el detalle de las fases de desarrollo originales, ver
[`EXPLICACION-FASES-2-5.md`](./EXPLICACION-FASES-2-5.md).

## Arranque

```bash
npm install
cp .env.example .env      # completa MONGO_URI con tu cadena de Atlas (ver abajo)
npm run dev                # http://localhost:3000
```

Revisa `http://localhost:3000/health`: `mongo` debe decir `"up"`.

## Base de datos: MongoDB Atlas (nube)

Este backend se conecta a Mongo por una sola variable, `MONGO_URI`, así que
apuntar a Atlas en vez de a un Mongo local es solo cuestión de cambiar esa
cadena. Pasos para conseguirla:

1. Crea una cuenta y un cluster gratuito (M0) en <https://www.mongodb.com/cloud/atlas>.
2. **Database Access** → crea un usuario de base de datos con contraseña
   (no el login de tu cuenta de Atlas, es un usuario aparte para la app).
3. **Network Access** → agrega la IP desde la que se conecta el backend.
   Para desarrollo local, "Allow access from anywhere" (`0.0.0.0/0`) es lo
   más simple; en producción, restringe a la IP real del servidor.
4. **Database** → **Connect** → **Drivers** → copia la cadena, que se ve así:
   ```
   mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Reemplaza `<usuario>` y `<password>`, y **agrega el nombre de la base
   justo antes del `?`** (Atlas no lo incluye por defecto, pero el proyecto
   lo necesita ahí, no en una variable aparte):
   ```
   MONGO_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/catalogobulk?retryWrites=true&w=majority
   ```
   Esto importa en particular para los tests (`tests/jest.setup.js`): toman
   el nombre de esa misma URL y le agregan el sufijo `_test`, para correr
   aislados en `catalogobulk_test` sin tocar los datos reales. Si el nombre
   no está en la URL, ese aislamiento no funciona.
6. La contraseña puede traer caracteres especiales (`@`, `#`, `%`...): si es
   así, codifícalos con `encodeURIComponent` antes de pegarlos en la URI
   (ej: `@` → `%40`), o Mongo va a interpretar mal la cadena de conexión.

No hace falta tener Mongo instalado ni corriendo en la máquina donde se
ejecuta el backend: todo el tráfico de base de datos sale a Atlas por
internet (`mongodb+srv://` resuelve por DNS), así que sí se necesita
conexión saliente a internet para que `conectarMongo()` (`src/config/db.js`)
funcione.

## Variables de entorno (`.env`)

```
PORT=3000
MONGO_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/catalogobulk?retryWrites=true&w=majority
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

5. **`src/middlewares/authOpcional.js`** (nuevo) y las rutas de lectura de
   `src/routes/producto.routes.js` / `categoria.routes.js` — estas rutas
   (`GET /productos`, `GET /productos/:id`, `GET /categorias`,
   `GET /categorias/:slug`) ya no exigen `auth`, para que el catálogo sea
   público. Usan `authOpcional` en vez de quitar el middleware sin más:
   si llega un token válido de admin, `req.usuario` queda disponible (para
   poder pedir también los registros inactivos con `?incluirInactivos=true`);
   si no llega ninguno, sigue funcionando igual, como visitante anónimo.
   Crear, editar y activar/desactivar (`POST`, `PUT`) siguen exigiendo `auth`
   + `rol('admin')`, sin cambios.

6. **`activo` en `Producto` y `Categoria`** (antes solo existía en
   `Proveedor`) — reemplaza al borrado en los tres módulos. Un registro con
   `activo: false` no se ve en el catálogo público ni en los filtros
   públicos, pero sigue existiendo (a diferencia de un `DELETE`, no rompe lo
   que ya lo referencia). Los endpoints `GET` filtran `activo: true` por
   defecto; solo un admin autenticado que pida explícitamente
   `?incluirInactivos=true` ve también los desactivados.

7. **`POST /api/categorias`** (nuevo, solo admin) — antes las categorías
   solo se creaban solas al importar un catálogo
   (`categoria.repository.js` → `upsertPorSlug`). Ahora se pueden crear a
   mano desde cero, para poder armar primero el árbol de categorías y luego
   los productos que las usan.

8. **`src/repositories/producto.repository.js` → `actualizar()`** — bug
   corregido: usaba `Producto.findByIdAndUpdate(...)`, que es una operación
   de consulta directa contra Mongo y **nunca dispara los hooks de
   documento** de Mongoose (como `pre('validate')`, que es justo el que
   recalcula `disponible` a partir de `stock`). Por eso, editar el stock de
   un producto no actualizaba su disponibilidad. Se corrigió cargando el
   documento con `findById`, asignándole los cambios y guardando con
   `.save()`, que sí dispara esos hooks — igual que al crear.
