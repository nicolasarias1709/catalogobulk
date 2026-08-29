<script setup>
/**
 * /layouts/AdminLayout.vue
 * Plantilla del panel con sesion, armada con el Layout Builder de Quasar:
 * https://quasar.dev/layout-builder
 *
 * Un layout es el marco fijo de la pantalla. Todas las vistas se pintan en su
 * <router-view>, asi que al navegar la barra y el menu NO se vuelven a montar.
 * Sin layouts habria que repetir este menu dentro de cada vista.
 *
 * El login NO usa este layout: es una pantalla suelta, sin barra ni menu,
 * porque sus enlaces llevarian a sitios donde todavia no se puede entrar.
 */
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useGeneralStore } from "@/store/General";
import { useAuthStore } from "@/store/Auth";
import { useNotificar } from "@/composables/useNotificar";
import { formatDateTime } from "@/utils/formatDate";
import logo from "@/assets/logo.svg";

const general = useGeneralStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { notificarInfo } = useNotificar();

/**
 * Cierra la sesion: limpia el store (y con el, el localStorage, porque el store
 * es persistido) y devuelve al login.
 */
const salir = () => {
  auth.cerrarSesion();
  notificarInfo("Sesion cerrada");
  router.push({ name: "login" });
};

/**
 * Opciones del menu lateral.
 * "name" es el nombre de la ruta declarada en /router/index.js. Se enlaza por
 * nombre y no por URL: si mañana cambia el path, el menu sigue funcionando.
 * Para agregar un modulo nuevo (por ejemplo, imports), se suma una linea aqui.
 */
const opcionesMenu = [
  { name: "dashboard", titulo: "Panel", icono: "dashboard" },
  { name: "productos", titulo: "Productos", icono: "inventory_2" },
  { name: "proveedores", titulo: "Proveedores", icono: "local_shipping" },
  { name: "categorias", titulo: "Categorías", icono: "category" },
];

// Titulo de la seccion actual, leido del meta de la ruta activa.
const tituloSeccion = computed(() => route.meta?.titulo || "Panel");
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Abrir menu"
          @click="general.alternarMenu()"
        />

        <q-toolbar-title class="text-weight-bold text-subtitle1">
          {{ tituloSeccion }}
        </q-toolbar-title>

        <div class="text-caption q-mr-sm gt-xs">
          {{ auth.nombreUsuario }}
        </div>

        <q-btn flat dense round icon="logout" aria-label="Cerrar sesion" @click="salir">
          <q-tooltip>Cerrar sesion</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- show-if-above: en pantallas grandes el menu queda fijo y visible;
         en movil se oculta y lo abre el boton de hamburguesa. -->
    <q-drawer v-model="general.menuAbierto" show-if-above bordered :width="248" class="bg-white">
      <div class="q-pa-md row items-center no-wrap">
        <img :src="logo" alt="Logo" width="34" height="34" class="q-mr-sm" />
        <div class="text-weight-bold">{{ general.titulo }}</div>
      </div>

      <q-separator />

      <q-list padding>
        <q-item-label header class="text-uppercase text-caption text-weight-bold">
          Menu
        </q-item-label>

        <q-item
          v-for="opcion in opcionesMenu"
          :key="opcion.name"
          v-ripple
          clickable
          class="enlace-menu"
          :to="{ name: opcion.name }"
        >
          <q-item-section avatar>
            <q-icon :name="opcion.icono" />
          </q-item-section>
          <q-item-section>{{ opcion.titulo }}</q-item-section>
        </q-item>
      </q-list>

      <!--
        Pie del menu. Lee del store General: cualquier vista que termine de
        cargar datos llama a general.marcarSincronizacion() y la hora se
        actualiza aqui sola, sin que este layout tenga que saber de donde vino.
      -->
      <div class="absolute-bottom q-pa-md text-caption texto-suave">
        <div>
          <q-icon name="dns" size="14px" class="q-mr-xs" />
          {{ general.urlApi }}
        </div>
        <div v-if="general.ultimaSincronizacion" class="q-mt-xs">
          <q-icon name="schedule" size="14px" class="q-mr-xs" />
          {{ formatDateTime(general.ultimaSincronizacion) }}
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <!-- Aqui entra la vista de la ruta activa: dashboard, productos... -->
      <router-view />
    </q-page-container>
  </q-layout>
</template>
