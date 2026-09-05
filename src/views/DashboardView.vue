<script setup>
/**
 * /views/DashboardView.vue
 * Pantalla de inicio del panel: accesos directos a los módulos y datos de la
 * sesión activa. Sigue sin llamar a ningún endpoint propio (no hay
 * GET /api/dashboard en el backend) — es solo un punto de partida cómodo tras
 * el login, con enlaces a las vistas reales.
 */
import { useAuthStore } from "@/store/Auth";

const auth = useAuthStore();

const accesos = [
  { name: "productos", titulo: "Productos", icono: "inventory_2", descripcion: "Catálogo por proveedor y categoría" },
  { name: "proveedores", titulo: "Proveedores", icono: "local_shipping", descripcion: "Empresas que surten el catálogo" },
  { name: "categorias", titulo: "Categorías", icono: "category", descripcion: "Se enriquecen tras la importación" },
];
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="contenedor-app q-pa-none">
      <h1 class="titulo-vista">Panel</h1>
      <hr class="linea-titulo" />

      <div class="row q-col-gutter-md q-mt-sm">
        <div v-for="acceso in accesos" :key="acceso.name" class="col-12 col-sm-4">
          <q-card flat bordered class="tarjeta cursor-pointer" @click="$router.push({ name: acceso.name })">
            <q-card-section class="row items-center no-wrap">
              <q-avatar square size="44px" color="primary" text-color="white" class="q-mr-md">
                <q-icon :name="acceso.icono" size="24px" />
              </q-avatar>
              <div>
                <div class="text-subtitle1 text-weight-bold">{{ acceso.titulo }}</div>
                <div class="text-caption texto-suave">{{ acceso.descripcion }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat bordered class="tarjeta q-mt-lg">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold">Sesión activa</div>
          <div class="text-body2 q-mt-sm">
            <div><strong>id de usuario:</strong> {{ auth.usuarioId }}</div>
            <div><strong>rol:</strong> {{ auth.rol }}</div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>
