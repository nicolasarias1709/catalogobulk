# Guía de despliegue — CatalogoBulk en Vercel

## Qué cambió respecto al proyecto original

1. **`api/index.js` (nuevo)** — entry point serverless para Vercel. Expone la
   app de Express sin `listen()` ni Socket.io (Vercel no soporta ninguno de
   los dos). `src/server.js` sigue intacto para correr local o en un host
   con servidor persistente.

2. **`frontend/`** — el frontend se reconstruyó desde cero como un proyecto
   Vue 3 + Quasar independiente (el código fuente original no estaba en el
   repo, solo el `dist/` ya compilado). Se replicaron las páginas según las
   rutas reales de la API (Productos, Categorías, Proveedores,
   Importaciones, Exportaciones, Login) y las clases CSS que existían en el
   `dist/` original (`tarjeta`, `encabezado-pagina`, `tabla-datos`,
   `columna-login`, `tarjeta-acceso`, `selector-formato`,
   `tarjeta-exportar`). El color primario usa el azul por defecto de Quasar,
   porque el bundle original no tenía una marca de color personalizada
   detectable.

3. **`vercel.json`** — configuración moderna (`buildCommand` +
   `outputDirectory` + `rewrites`), sin el `builds`/`routes` legacy que
   traía el original (y que apuntaba a un archivo `src/index.js`
   inexistente).

4. **Sockets → polling.** La página de Importaciones ya no depende de
   Socket.io para el progreso en tiempo real (imposible en serverless):
   ahora consulta `GET /api/imports` cada 5 segundos.

## Limitación que sigue sin poder resolverse solo con configuración

**El worker de BullMQ (`src/workers/import.worker.js`) no puede correr
dentro de una función serverless de Vercel.** Necesita un proceso siempre
encendido. Sin él corriendo en algún lado, los imports se quedan en estado
`pending` para siempre — Vercel puede recibir el archivo y encolarlo, pero
nada lo va a procesar.

Opciones:
- Correr el worker en **Render** o **Railway** (plan gratis de "Background
  Worker"), apuntando al mismo `MONGO_URI` y `REDIS_URL` que uses en Vercel.
- Correrlo en tu propia máquina/VM con `npm run worker` mientras haces
  pruebas.
- Si tu volumen de importaciones es bajo, podrías más adelante migrar todo
  el backend a Render/Railway y quitarte esta complejidad — ahí
  `src/server.js` corre tal cual, con sockets y worker incluidos.

## Pasos para desplegar

1. **Variables de entorno reales** — crea tu propio `.env` local a partir de
   `.env.example` (Mongo Atlas, Redis de Upstash con la URL en formato
   **TCP**, no REST, y un `JWT_SECRET` generado con
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

2. Sube el proyecto a GitHub.

3. Impórtalo en Vercel. Como ya trae `vercel.json` con `buildCommand` y
   `outputDirectory` explícitos, no hace falta tocar nada en "Framework
   Preset" (déjalo en "Other").

4. En **Settings → Environment Variables** agrega las mismas variables de
   tu `.env` (para Production).

5. Despliega. `/` sirve el frontend estático y `/api/*` las funciones
   serverless.

6. Aparte, despliega `src/server.js` + `src/workers/import.worker.js` en
   Render/Railway (o corre el worker donde prefieras) apuntando al mismo
   Mongo/Redis, para que las importaciones sí se procesen.

## Correr todo en local (como antes)

```bash
npm install
cp .env.example .env   # y llena los valores reales
npm run dev             # backend en :3000 (con sockets, como el original)
npm run worker          # en otra terminal: procesa las importaciones

cd frontend
npm install
npm run dev              # frontend en :5173, con proxy hacia :3000
```
