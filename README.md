# CatalogoBulk

Sistema de catálogo de productos con importación masiva. Monorepo con backend
y frontend en carpetas separadas.

```
catalogobulk/
├── backend/     API REST (Node + Express + MongoDB + Redis/BullMQ)
├── frontend/    Panel de administración (Vue 3 + Quasar)
└── README.md    este archivo
```

## Arranque rápido

### Backend
```bash
cd backend
npm install
npm run dev              # http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

Cada carpeta tiene su propio `README.md` con el detalle completo: variables
de entorno, cómo crear el primer usuario, y qué revisar si algo falla.

## Documentación por proyecto

- [`backend/README.md`](./backend/README.md) — API, base de datos, Redis, colas de importación.
- [`frontend/README.md`](./frontend/README.md) — Vue/Quasar, módulos (Productos, Proveedores, Categorías), cómo se conecta al backend.
