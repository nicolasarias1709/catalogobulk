# CatalogoBulk — Frontend (Vue 3 + Quasar + Vue Router + Pinia)

Estructura de carpetas calcada de `estructura_frontend` (una responsabilidad
por carpeta). Ya tiene **login + CRUD de Productos, Proveedores y Categorías**
conectados de verdad al backend `catalogobulk`. Falta el módulo de
importaciones masivas con progreso en tiempo real (socket.io).

```
src/
├── assets/         logo.svg
├── components/
│   ├── Encabezados/  EncabezadoPagina.vue (icono + título + acciones)
│   └── Tables/       TablaDatos.vue (envoltorio de q-table, modo cliente y modo servidor)
├── composables/    useNotificar.js, useConfirmar.js
├── layouts/        AdminLayout.vue (barra + menú lateral + pie con estado)
├── plugins/        axios.js, quasar.js
├── router/         index.js (login público + rutas privadas del panel)
├── services/       api.service.js (get/post/put/del)
├── store/          Auth.js, General.js
├── styles/         variables.scss, main.scss
├── utils/          reglas.js, validateEmail.js, formatDate.js, jwt.js
├── views/
│   ├── LoginView.vue
│   ├── DashboardView.vue      (accesos directos a los módulos)
│   ├── ProductosView.vue      (CRUD, paginación de servidor, filtros, selector de proveedor)
│   ├── ProveedoresView.vue    (CRUD, paginación de servidor, activar/desactivar)
│   ├── CategoriasView.vue     (solo lectura + edición; no hay creación ni borrado)
│   └── NotFoundView.vue
├── App.vue
└── main.js
```

---

## Cómo se comporta cada módulo (y por qué)

### Categorías — sin botón de crear ni de eliminar
El backend no expone `POST /api/categorias` ni `DELETE` (ver
`routes/categoria.routes.js`). Las categorías se crean solas cuando se importa
un catálogo (`repositories/categoria.repository.js` → `upsertPorSlug`, usada
por el worker de imports). Desde el frontend solo se pueden **enriquecer**:
nombre visible, descripción, imagen. El slug se muestra pero no se edita — es
la llave que usan los productos ya importados.

### Proveedores — CRUD completo, borrado protegido
Si un proveedor tiene productos asociados, el backend responde `409` en vez
de borrarlo (`helpers/proveedor.service.js`). El frontend detecta ese código y
sugiere **desactivarlo** en su lugar (`activo: false`), que es justo lo que
permite el botón de encender/apagar de la tabla.

### Productos — el más enredado de los tres
- Cada producto necesita un `proveedorId`: el formulario trae un `<q-select>`
  alimentado con `GET /proveedores`.
- El backend **no hace `populate()`** de `proveedorId` al listar, así que la
  columna "Proveedor" de la tabla arma su propio mapa `id -> nombre` con los
  proveedores ya cargados para el select — no hace una petición extra por fila.
- `disponible` **nunca se envía**: el backend lo calcula solo a partir del
  `stock` (`producto.model.js` → `pre('validate')`). En el formulario se
  muestra como dato informativo, no como campo editable.
- Los filtros (categoría, proveedor, disponible) van como *query params* al
  backend — no se filtra en el navegador, porque la lista pagina en el
  servidor.

### Paginación: cliente vs. servidor (`TablaDatos.vue`)
`GET /api/categorias` trae todo de una — modo **cliente** (paginado por
Quasar en el navegador, como en el proyecto de referencia).
`GET /api/productos` y `GET /api/proveedores` devuelven
`{ data, page, limit, total }` — modo **servidor**: cada cambio de página
dispara una nueva petición al backend con esos parámetros. Esta diferencia no
existe en `estructura_frontend` (ahí todas las listas eran chicas); se agregó
porque el catálogo de CatalogoBulk puede tener miles de productos tras una
importación masiva.

---

## Diferencias frente al backend de referencia (`backend prueba`)

| Punto | `backend prueba` (referencia) | `catalogobulk` (el tuyo) |
|---|---|---|
| Cabecera del token | `x-token: <jwt>` | `Authorization: Bearer <jwt>` |
| Respuesta del login | `{ usuario, token }` | **solo** `{ token }` |
| Formato de error | `{ msg, errors: [] }` | `{ error: { codigo, mensaje } }` |

Como el login no devuelve el objeto `usuario`, `src/utils/jwt.js` decodifica
(sin verificar — eso lo sigue haciendo solo el backend) el payload del JWT
para leer `sub` (id) y `rol`.

---

## Lo que se modificó en el backend (y por qué) — historial completo

Todo esto ya viene aplicado en el zip del backend que te compartí junto con
este frontend. Se resume aquí para que quede constancia de cada cambio:

1. **`src/app.js`** — se agregó `app.use(cors())`. El paquete `cors` ya
   estaba en `package.json` pero no se usaba en ningún lado; sin él, el
   navegador bloquea las peticiones del frontend (puerto 5173) a la API
   (puerto 3000) aunque el backend esté perfecto.

2. **`src/config/redis.js`** — el `retryStrategy` ya no reintenta para
   siempre: se rinde tras 3 intentos, y el error se avisa **una sola vez**
   por consola en vez de repetirse sin fin. Esto permite trabajar **sin
   instalar Redis** mientras no uses importaciones masivas: el login y el
   CRUD de Mongo no dependen de Redis para nada.

3. **`src/queues/import.queue.js`** y **`src/sockets/index.js`** — se les
   agregó `.on('error', ...)`. Sin esto, un fallo de conexión a Redis hacía
   que **todo el proceso de Node se cayera** (BullMQ re-emite los errores de
   conexión como su propio evento `'error'`, y en Node un `'error'` sin
   quien lo escuche mata el proceso). `sockets/index.js` es el que realmente
   causaba el crash, porque `server.js` lo carga en cada arranque.

4. **`src/workers/import.worker.js`** — mismo `.on('error', ...)` agregado
   de forma preventiva, para cuando uses `npm run worker`.

**Conclusión práctica:** hoy puedes trabajar con el login y con Productos /
Proveedores / Categorías teniendo **solo Mongo** corriendo. Redis únicamente
hace falta cuando construyas el módulo de importaciones masivas.

---

## Puesta en marcha, paso a paso

### 1. Backend

```bash
cd catalogobulk_restructurado
npm install
npm run dev              # queda en http://localhost:3000
```

Verás un aviso de Redis (una sola vez) si no lo tienes instalado — es
normal e inofensivo para todo lo que ya está construido.

Revisa `http://localhost:3000/health`: `mongo` debe decir `"up"`.

### 2. Crear el primer usuario

Este backend no trae seed de usuarios. `POST /api/auth/register` no pide
token, así que se hace una sola vez (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"admin@catalogobulk.com","password":"secreta123","rol":"admin"}'
```

### 3. Frontend

```bash
cd catalogobulk-frontend
npm install
cp .env.example .env     # ya viene con VITE_API_URL=http://localhost:3000/api
npm run dev               # queda en http://localhost:5173
```

Entra a `http://localhost:5173`, inicia sesión, y ya deberías ver el menú
lateral con **Panel, Productos, Proveedores y Categorías**.

Para probar el flujo completo con datos reales, el orden lógico es:
1. Crea un **proveedor** (Proveedores → Nuevo proveedor).
2. Crea un **producto** apuntando a ese proveedor (Productos → Nuevo producto).
3. Entra a **Categorías**: verás la que acabas de usar en el producto, ya
   creada sola por el backend — solo falta que le pongas nombre/descripción.

---

## Qué revisar si algo falla

| Síntoma | Causa probable | Dónde se arregla |
|---|---|---|
| `blocked by CORS policy` en la consola | Backend sin `cors()`, o corriendo en otro puerto | `src/app.js` del backend |
| `ERR_CONNECTION_REFUSED` | El backend no está corriendo | Terminal del backend |
| `/health` responde `mongo: "down"` | Mongo no está levantado o `MONGO_URI` está mal | `.env` del backend |
| 401 al entrar al login | Email/contraseña no coinciden con ningún usuario | Repite el registro del paso 2 |
| "No hay proveedores disponibles" al crear un producto | Aún no creaste ningún proveedor | Ve primero a Proveedores → Nuevo |
| 409 al eliminar un proveedor | Tiene productos asociados | Usa el botón de desactivar en su lugar |
| El proceso del backend se cae solo | Revisa que tengas el backend con los 4 archivos del historial de cambios de arriba | `catalogobulk-backend-con-cors.zip` |

---

## Próximos pasos sugeridos

**Imports con progreso en tiempo real**: es el único módulo que falta, y el
más distinto del proyecto de referencia porque necesita:
- Un `src/plugins/socket.js` nuevo (no existe en la referencia) que conecte
  con `socket.io-client`, autenticado con el mismo token del store `Auth`.
- Una vista con subida de archivo (`multipart/form-data`, ver
  `middlewares/upload.js` del backend) y una barra de progreso que escuche
  los eventos que emite `src/sockets/index.js`.
- Esto sí necesita Redis real corriendo (Memurai o WSL en Windows, sin
  Docker), porque la cola de importación (BullMQ) no tiene sustituto local.
