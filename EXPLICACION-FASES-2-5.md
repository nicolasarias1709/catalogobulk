# CatálogoBulk — Fases 2 a 5 explicadas

> Este documento cubre lo que faltaba del taller: **Fase 2 (recibir e
> encolar), Fase 3 (el worker que procesa), Fase 4 (progreso en tiempo
> real) y Fase 5 (caché)**. La Fase 0 (setup) y Fase 1 (auth + CRUD) ya
> las tenías. Aquí no repito teoría general del proyecto — asumo que ya
> leíste la explicación de la Fase 0-1 — me enfoco en qué se agregó y por qué.

## El mapa completo, en una imagen mental

```
Admin sube archivo
        │
        ▼
POST /api/imports  ───────────────►  responde 202 en milisegundos
        │                             (Fase 2 — este endpoint NO procesa nada)
        │  crea ImportJob(pending)
        │  encola en BullMQ
        ▼
   Cola "imports" (Redis)
        │
        ▼
import.worker.js  ◄──── proceso APARTE, corre con `npm run worker`
        │                (Fase 3 — aquí vive el trabajo pesado)
        │  lee el archivo
        │  valida y normaliza fila por fila
        │  inserta en lotes
        │  actualiza el ImportJob y reporta % de avance
        │  al terminar: invalida la caché de productos
        ▼
   ImportJob(completed) + productos insertados + categorías creadas
        │
        ├──► Socket.io retransmite el progreso en vivo (Fase 4)
        └──► GET /api/productos y /stats quedan frescos (Fase 5)
```

Cada fase es una pieza de este flujo. Vamos una por una.

---

## Fase 2 — Recibir el archivo y encolar (sin procesar)

### Objetivo

`POST /api/imports` tiene que responder en milisegundos. Su único trabajo
es: recibir el archivo, validar lo mínimo indispensable (que el proveedor
exista y esté activo, que la extensión sea correcta), guardar un
`ImportJob` en `pending`, y ponerlo en la cola. **No lee el contenido del
archivo.** Eso es trabajo del worker (Fase 3).

### Piezas nuevas

| Archivo | Qué hace |
|---|---|
| `src/middlewares/upload.js` | Multer con `diskStorage`: guarda el archivo en `/uploads` con un nombre único (`timestamp-nombreoriginal`), filtra por extensión `.csv`/`.json`, limita tamaño con `MAX_FILE_SIZE_MB` |
| `src/queues/import.queue.js` | Define la `Queue` de BullMQ llamada `"imports"`, usando el mismo cliente Redis que ya tenías |
| `src/modules/imports/import.repository.js` | CRUD básico sobre `ImportJob` (crear, buscar por id, actualizar, listar) |
| `src/modules/imports/import.service.js` | La lógica: valida proveedor, crea el job en `pending`, lo encola, calcula `porcentaje` al consultar |
| `src/modules/imports/import.controller.js` + `import.routes.js` | Exponen `POST /api/imports`, `GET /api/imports/:id`, `GET /api/imports` |

### Por qué el archivo se guarda en disco antes de encolar

BullMQ guarda en Redis los **datos del job** (`{ importJobId: "..." }`), no
el archivo en sí — eso sería carísimo para Redis. Por eso Multer lo deja
en `/uploads` y lo único que viaja por la cola es la referencia
(`archivoRuta`, guardada en el `ImportJob`). El worker, cuando toma el
job, va y lee ese archivo del disco.

> **Importante para tu entorno sin Docker:** como no hay un volumen
> compartido entre contenedores, el worker y el API **deben correr en la
> misma máquina** (o compartir el mismo filesystem) para que uno pueda
> leer lo que el otro escribió en `/uploads`. Si en algún momento separas
> el API y el worker en máquinas distintas, tendrías que cambiar el
> almacenamiento del archivo a algo compartido (S3, por ejemplo) — pero
> eso está fuera del alcance de este taller.

### El contrato de errores (sección 7.5)

```js
// import.service.js
if (!archivo) throw new AppError(400, '...', 'ARCHIVO_REQUERIDO');
if (extensión inválida) throw new AppError(400, '...', 'EXTENSION_INVALIDA');
if (proveedor no existe) throw new AppError(404, '...', 'PROVEEDOR_NO_ENCONTRADO');
if (proveedor.activo === false) throw new AppError(409, '...', 'PROVEEDOR_INACTIVO');
if (archivo muy grande) throw new AppError(413, '...', 'ARCHIVO_MUY_GRANDE'); // desde el middleware de Multer
```

Fíjate que el error de "archivo muy grande" no lo lanza el service —
lo detecta Multer (`multer.MulterError`, código `LIMIT_FILE_SIZE`) y hay
que traducirlo a `AppError` a mano en las rutas (`import.routes.js`,
función `subirArchivo`), porque si no, Express lo deja pasar como un
error crudo sin el formato `{ error: { codigo, mensaje } }` que usa el
resto de la API.

### Cómo probarlo

```bash
curl -X POST http://localhost:3000/api/imports \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -F "archivo=@data/catalogo-prueba.csv" \
  -F "proveedorId=<PROVEEDOR_ID>"
# → 202 { "importJobId": "...", "estado": "pending" }
```

Sin el worker corriendo, el job se queda en `pending` para siempre — eso
es normal y esperado en esta fase.

---

## Fase 3 — El worker: donde se hace el trabajo pesado

### Objetivo

Un **proceso completamente separado** (`node src/workers/import.worker.js`,
o `npm run worker`) que escucha la cola `"imports"`, toma los jobs uno por
uno, y por cada uno:

1. Lee el archivo completo
2. Valida cada fila (sección 6.3 del contrato)
3. Normaliza las filas válidas (sección 6.4)
4. Inserta en la base de datos, por lotes
5. Va actualizando el `ImportJob` con el progreso
6. Al final, crea las categorías nuevas y marca el job como `completed`

### Por qué es un proceso aparte y no una función del API

Si esto corriera dentro de `server.js`, procesar 120.000 filas
**bloquearía el event loop** de Node y ninguna otra petición HTTP podría
atenderse mientras tanto. Al ser un proceso Node distinto, tiene su
propio event loop: el API sigue respondiendo peticiones normales mientras
el worker mastica el archivo en paralelo.

### Piezas nuevas

| Archivo | Qué hace |
|---|---|
| `src/workers/fileReader.js` | Lee el CSV o JSON completo y lo convierte en un array de objetos. Si el archivo está corrupto o le faltan columnas obligatorias, lanza un error (esto es lo que produce un `ImportJob` en estado `failed`) |
| `src/workers/rowProcessor.js` | Función pura: recibe una fila cruda, devuelve si es válida y normalizada, o por qué se rechaza. No toca la base de datos — por eso es fácil de testear aislado |
| `src/workers/import.worker.js` | El orquestador: arma el `Worker` de BullMQ, procesa cada job, maneja los lotes, guarda el progreso |

### El flujo interno, paso a paso

```js
// import.worker.js (resumen)
job.estado = 'processing'; job.startedAt = new Date(); await job.save();

const filas = leerArchivoCatalogo(job.archivoRuta); // puede lanzar -> failed
job.total = filas.length;

for (cada fila) {
  const resultado = validarYNormalizarFila(fila);

  if (!resultado.valido) {
    fallidos++; errores.push({ fila, sku, motivo });
  } else if (sku ya visto en este archivo) {
    fallidos++; errores.push({ fila, sku, motivo: 'sku duplicado' });
  } else {
    lote.push(resultado.fila);
  }

  if (lote.length >= BATCH_SIZE) insertarLote(lote); // bulk insert
  if (procesados % BATCH_SIZE === 0) {
    job.procesados = ...; await job.save();
    bullJob.updateProgress(porcentaje); // esto alimenta la Fase 4
  }
}

await categoriaRepo.upsertPorSlug(...) para cada categoría nueva;
job.estado = 'completed'; job.finishedAt = new Date(); await job.save();
await invalidarCacheProductos(); // esto alimenta la Fase 5
```

### Tres decisiones de diseño que vale la pena que entiendas

**1. `insertMany(lote, { ordered: false })`**

Si un producto del lote choca contra el índice único de `sku` (porque ya
existe en la base de otro import anterior), con `ordered: true` Mongo
abortaría el lote completo en el primer error. Con `ordered: false`,
sigue insertando el resto y te devuelve un error con el detalle de cuáles
fallaron (`err.writeErrors`, `err.insertedDocs`). Así una fila mala no
tumba las otras 499 del mismo lote.

**2. Dos tipos de "sku duplicado" distintos**

- **Duplicado dentro del mismo archivo**: se detecta con un `Set` en
  memoria (`skusVistosEnArchivo`) mientras se recorre el archivo — es
  barato y rápido.
- **Duplicado contra la base de datos** (otro import anterior, u otro
  producto creado a mano): solo se descubre cuando Mongo rechaza el
  insert por el índice único — por eso se maneja en el `catch` del
  `insertMany`.

**3. El progreso se reporta cada `BATCH_SIZE` filas, no en cada fila**

Actualizar el `ImportJob` en Mongo y emitir un evento de progreso en
*cada* fila, con 120.000 filas, saturaría tanto Mongo como Redis. Por eso
solo se guarda progreso cuando se completa un lote (o al llegar a la
última fila).

### Un archivo corrupto ≠ filas malas

Esto es una distinción clave del contrato (sección 5.5): si el **archivo
completo** no se puede leer (JSON mal formado, o un CSV sin las columnas
obligatorias en el header), el `ImportJob` pasa a `failed` con
`motivoFallo`. Pero si el archivo se lee bien y **algunas filas** están
sucias, esas se cuentan en `fallidos` y el job igual termina en
`completed` — filas malas no es un fallo del job, es parte de lo esperado.

### Cómo probarlo

```bash
# 1. Genera un archivo de prueba con filas sucias
npm run generar-catalogo -- 5000 data/catalogo-prueba.csv

# 2. En una terminal, corre el worker
npm run worker

# 3. En otra, sube el archivo (como en la Fase 2)
curl -X POST http://localhost:3000/api/imports ...

# 4. Consulta el progreso hasta que estado sea "completed"
curl http://localhost:3000/api/imports/<IMPORT_JOB_ID> -H "Authorization: Bearer <TOKEN>"
```

También incluí `tests/workerLogic.test.js`, que prueba `rowProcessor.js` y
`fileReader.js` de forma aislada (sin Mongo ni Redis) — ya los corrí y
pasan los 9 casos, incluyendo el ejemplo exacto de normalización de la
sección 6.4 del contrato.

---

## Fase 4 — Progreso en tiempo real con Socket.io

### Objetivo

Que un cliente pueda ver el `%` de avance de su import sin tener que
hacer polling a `GET /api/imports/:id` cada segundo.

### Piezas nuevas

`src/sockets/index.js` — inicializa Socket.io sobre el mismo servidor
HTTP, y usa `QueueEvents` de BullMQ para escuchar lo que el worker va
reportando.

### Cómo encajan las piezas

El worker, en la Fase 3, llama `bullJob.updateProgress(porcentaje)`. Eso
no habla directo con Socket.io — BullMQ simplemente publica un evento
`"progress"` en Redis. `QueueEvents` (que corre dentro del proceso del
**API**, no del worker) está escuchando esos eventos, y cuando llega uno,
lo retransmite por Socket.io.

```
worker.js                    Redis (BullMQ)                 server.js (API)
   │                              │                                │
   │ bullJob.updateProgress(40) ─►│                                │
   │                              │──► evento "progress" ────────► │ QueueEvents lo recibe
   │                              │                                │──► io.to(importJobId).emit(...)
```

### Por qué "rooms" (salas) por `importJobId`

Si un cliente hace `socket.emit('import:suscribirse', importJobId)`, se
une a una sala con ese mismo nombre. El servidor solo emite el progreso
`io.to(importJobId).emit(...)` — así cada cliente solo ve el progreso del
import que le importa, no el de todos los imports de todos los admins.

### Un matiz: `bullJobId` vs `importJobId`

BullMQ identifica sus jobs con su propio id interno; el `ImportJob` de
Mongo tiene el suyo (`_id`). Por eso, cuando llega un evento de progreso
de BullMQ, hay que buscar en Mongo cuál `ImportJob` tiene ese
`bullJobId` guardado (se guardó al crear el import, en la Fase 2) para
saber a qué sala emitir.

### Cómo probarlo desde el cliente (ejemplo)

```js
// en el navegador o un script de prueba
const socket = io('http://localhost:3000', { auth: { token: '<TU_JWT>' } });

socket.emit('import:suscribirse', '<IMPORT_JOB_ID>');

socket.on('import:progreso', (data) => {
  console.log(data); // { importJobId, porcentaje, estado }
});
```

---

## Fase 5 — Caché de las consultas pesadas

### Objetivo

`GET /api/productos` y `GET /api/productos/stats` pueden ser consultas
caras (agregaciones sobre miles de productos). Se cachean en Redis por
`CACHE_TTL_SECONDS`, y esa caché se **invalida automáticamente** cuando
un import termina — porque en ese momento los datos que esas rutas
devuelven cambiaron de verdad.

### Piezas nuevas

| Archivo | Qué hace |
|---|---|
| `src/config/cache.js` | `obtenerCache`, `guardarCache`, `invalidarCacheProductos` — helpers puros sobre el cliente Redis compartido |
| `src/middlewares/cache.js` | Middleware que envuelve una ruta GET: si hay algo cacheado para esa URL exacta (con su query string), lo devuelve; si no, deja pasar y guarda la respuesta antes de mandarla |

### Por qué la key de caché es la URL completa

`GET /api/productos?categoria=ropa&page=1` y
`GET /api/productos?categoria=hogar&page=1` son consultas distintas y no
deben compartir cache. Usar `req.originalUrl` como key (con el prefijo
`cache:productos:`) resuelve esto sin tener que armar la key a mano por
cada combinación de filtros.

### Si Redis falla, la app no se cae

`obtenerCache` y `guardarCache` atrapan cualquier error de Redis y
simplemente actúan como si no hubiera caché (`return null` / no hacer
nada). Cachear es una optimización, no algo de lo que dependa la
correctitud del sistema — si Redis está caído, prefieres respuestas un
poco más lentas a que la API entera deje de funcionar.

### La invalidación: la conexión con la Fase 3

```js
// al final de import.worker.js, justo después de marcar el job completed
await invalidarCacheProductos();
```

Esto borra **todas** las keys con el prefijo `cache:productos:` (usa
`redis.keys()` + `redis.del()`). Es una invalidación "de brocha gorda":
no intenta ser quirúrgica sobre qué combinaciones de filtros cambiaron,
simplemente limpia todo lo cacheado de productos cuando el catálogo pudo
haber cambiado. Para el volumen de este proyecto es una decisión
razonable — una invalidación más fina (por categoría, por proveedor)
sería una optimización futura, no algo que pida el contrato.

### Cómo comprobarlo

```bash
curl -i http://localhost:3000/api/productos -H "Authorization: Bearer <TOKEN>"
# primera vez: header X-Cache: MISS

curl -i http://localhost:3000/api/productos -H "Authorization: Bearer <TOKEN>"
# segunda vez (dentro de CACHE_TTL_SECONDS): header X-Cache: HIT

# corre un import completo, y repite la consulta:
curl -i http://localhost:3000/api/productos -H "Authorization: Bearer <TOKEN>"
# vuelve a ser MISS, porque el worker invalidó la caché al terminar
```

---

## Checklist final (todas las fases)

- [ ] `POST /api/imports` responde 202 en milisegundos, sin leer el archivo
- [ ] El `ImportJob` se queda en `pending` si no hay worker corriendo
- [ ] Con `npm run worker` corriendo, el job pasa por `processing` → `completed`
- [ ] Un archivo con filas sucias termina en `completed` con `fallidos > 0`, no en `failed`
- [ ] Un archivo corrupto (JSON mal formado, CSV sin header válido) termina en `failed`
- [ ] Las categorías nuevas aparecen en `GET /api/categorias` después del import
- [ ] Conectado por socket y suscrito al `importJobId`, se reciben eventos `import:progreso`
- [ ] `GET /api/productos` devuelve `X-Cache: MISS` la primera vez y `HIT` la segunda
- [ ] Después de un import, la caché de productos se refresca sola

## Qué quedó fuera a propósito

- Invalidación de caché más granular (por filtro específico)
- Reintentos automáticos de jobs fallidos en BullMQ (tiene soporte nativo, no se configuró)
- Autenticación de sockets con revalidación en reconexiones largas (se valida solo al conectar)
- Un endpoint para cancelar un import en curso
