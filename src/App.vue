<script setup>
/**
 * App.vue — componente RAIZ de la aplicacion.
 *
 * Debe quedarse practicamente vacio: su unico trabajo es ceder el espacio al
 * router. Quien decide que layout y que vista se pintan es /router/index.js.
 *
 * Error tipico del principiante: meter aqui la barra de navegacion. Si se hace,
 * esa barra sale en TODAS las pantallas (incluido el login o el 404) y ya no se
 * puede tener un diseño distinto por seccion. Ese trabajo es de /layouts.
 */
</script>

<template>
  <router-view />
</template>
