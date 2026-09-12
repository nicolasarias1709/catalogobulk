<template>
  <div class="encabezado-pagina row items-center">
    <q-icon
      class="encabezado-pagina__icono bg-primary text-white q-pa-sm q-mr-md"
      :name="icono"
      size="28px"
    />
    <div>
      <div class="text-h6">{{ titulo }}</div>
      <p v-if="subtitulo" class="encabezado-pagina__subtitulo">{{ subtitulo }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  icono: { type: String, default: 'inventory_2' },
});
</script>

<style scoped>
.encabezado-pagina {
  margin-bottom: 24px;
}
.encabezado-pagina__icono {
  border-radius: 10px;
}
.encabezado-pagina__subtitulo {
  font-size: 14px;
  color: #616161;
  margin: 4px 0 0;
}
</style>
