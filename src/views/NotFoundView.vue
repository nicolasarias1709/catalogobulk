<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <q-page class="flex flex-center column q-pa-lg">
    <div class="text-h3 text-weight-bold text-primary">404</div>
    <p class="texto-suave q-mb-lg">La pagina que buscas no existe.</p>
    <q-btn unelevated no-caps color="primary" label="Volver" @click="router.push({ name: 'dashboard' })" />
  </q-page>
</template>
