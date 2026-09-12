<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          v-if="usuario"
          flat dense round icon="menu"
          @click="drawerAbierto = !drawerAbierto"
        />
        <q-avatar v-else color="white" text-color="primary" size="32px" class="q-mr-sm">
          CB
        </q-avatar>
        <q-toolbar-title>Catálogo</q-toolbar-title>
        <q-btn
          v-if="usuario"
          flat dense round icon="logout"
          @click="cerrarSesion"
        >
          <q-tooltip>Cerrar sesión ({{ usuario.email }})</q-tooltip>
        </q-btn>
        <q-btn
          v-else
          flat dense icon="login" label="Iniciar sesión"
          to="/login"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="usuario"
      v-model="drawerAbierto"
      show-if-above
      bordered
    >
      <q-list>
        <q-item clickable to="/productos" active-class="text-primary">
          <q-item-section avatar><q-icon name="inventory" /></q-item-section>
          <q-item-section>Productos</q-item-section>
        </q-item>
        <q-item clickable to="/categorias" active-class="text-primary">
          <q-item-section avatar><q-icon name="category" /></q-item-section>
          <q-item-section>Categorías</q-item-section>
        </q-item>
        <q-item clickable to="/proveedores" active-class="text-primary">
          <q-item-section avatar><q-icon name="local_shipping" /></q-item-section>
          <q-item-section>Proveedores</q-item-section>
        </q-item>
        <q-item clickable to="/importaciones" active-class="text-primary">
          <q-item-section avatar><q-icon name="upload_file" /></q-item-section>
          <q-item-section>Importaciones</q-item-section>
        </q-item>
        <q-item clickable to="/exportaciones" active-class="text-primary">
          <q-item-section avatar><q-icon name="download" /></q-item-section>
          <q-item-section>Exportaciones</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const drawerAbierto = ref(true);

const usuario = computed(() => {
  route.path; // dependencia reactiva: recalcula en cada navegación (login/logout)
  const raw = localStorage.getItem('usuario');
  return raw ? JSON.parse(raw) : null;
});

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  router.push('/login');
}
</script>
