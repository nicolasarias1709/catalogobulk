<script setup>
/**
 * COMPONENTE REUTILIZABLE — /components/Encabezados/EncabezadoPagina.vue
 *
 * Encabezado estandar de cualquier pantalla: icono + titulo + subtitulo y un
 * espacio libre a la derecha para los botones de accion.
 *
 * ¿Por que vive en /components y no en /views?
 * Porque NO conoce ninguna ruta ni ningun dato del backend. Recibe todo por
 * props y no decide nada: eso lo hace reutilizable. Una vista, en cambio, si
 * sabe que datos pedir y a que store llamar.
 *
 * Uso:
 *   <EncabezadoPagina titulo="Productos" subtitulo="Catalogo" icono="inventory_2">
 *     <template #acciones>
 *       <q-btn label="Nuevo" @click="abrir" />
 *     </template>
 *   </EncabezadoPagina>
 */
defineProps({
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: "" },
  icono: { type: String, default: "" },
});
</script>

<template>
  <header class="encabezado-pagina">
    <div class="row items-center justify-between q-col-gutter-md">
      <div class="col-12 col-sm">
        <div class="row items-center no-wrap">
          <q-avatar
            v-if="icono"
            square
            size="44px"
            color="primary"
            text-color="white"
            class="q-mr-md encabezado-pagina__icono"
          >
            <q-icon :name="icono" size="24px" />
          </q-avatar>

          <div>
            <h1 class="titulo-vista">{{ titulo }}</h1>
            <p v-if="subtitulo" class="encabezado-pagina__subtitulo">{{ subtitulo }}</p>
          </div>
        </div>
      </div>

      <!-- SLOT: el componente no sabe que botones van, los pone quien lo usa. -->
      <div class="col-12 col-sm-auto">
        <slot name="acciones" />
      </div>
    </div>

    <hr class="linea-titulo" />
  </header>
</template>

<style scoped lang="scss">
.encabezado-pagina {
  margin-bottom: 24px;

  &__icono {
    border-radius: 10px;
  }

  &__subtitulo {
    font-size: 14px;
    color: #616161;
    margin: 4px 0 0;
  }
}
</style>
