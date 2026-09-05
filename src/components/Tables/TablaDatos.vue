<script setup>
/**
 * COMPONENTE REUTILIZABLE — /components/Tables/TablaDatos.vue
 *
 * Envoltorio sobre <q-table> con las decisiones ya tomadas: buscador, paginado,
 * estado "cargando" y mensaje cuando no hay datos.
 *
 * DOS MODOS:
 *
 * 1. CLIENTE (por defecto, modoServidor=false): se le pasan TODAS las filas y
 *    q-table pagina/filtra por su cuenta en el navegador. Es el modo que usa
 *    Categorias (GET /api/categorias trae todo, sin paginar).
 *
 * 2. SERVIDOR (modoServidor=true): el backend pagina (GET /api/productos y
 *    GET /api/proveedores devuelven { data, page, limit, total }). Aqui SOLO
 *    llegan las filas de la pagina actual, y q-table avisa con @peticion
 *    cada vez que el usuario cambia de pagina/orden, para que la VISTA vuelva
 *    a pedir al backend con esos parametros. Por eso en este modo se oculta
 *    el buscador propio: filtrar en el navegador solo buscaria dentro de la
 *    pagina ya cargada, y eso confundiria mas de lo que ayuda.
 *
 * Esta extension de dos modos NO existe en el proyecto de referencia
 * (estructura_frontend), donde todas las listas eran chicas y cabian
 * completas en memoria. Se agrego aqui porque el catalogo de CatalogoBulk
 * puede tener miles de productos tras una importacion masiva.
 */
import { computed, ref, useSlots } from "vue";

const props = defineProps({
  /** Array de objetos a mostrar (las filas de la pagina actual). */
  filas: { type: Array, required: true },
  /** Definicion de columnas de Quasar: { name, label, field, align, sortable }. */
  columnas: { type: Array, required: true },
  /** Muestra la barra de progreso mientras llegan los datos del backend. */
  cargando: { type: Boolean, default: false },
  /** Campo unico de cada fila. En Mongo siempre es "_id". */
  filaClave: { type: String, default: "_id" },
  /** Texto cuando la consulta no devolvio nada. */
  mensajeVacio: { type: String, default: "No hay registros para mostrar" },

  // --- Props exclusivas del modo servidor -----------------------------
  /** Activa el modo servidor (paginacion real del backend). */
  modoServidor: { type: Boolean, default: false },
  /** Total de registros que existen en el backend (no solo los cargados). */
  filasTotales: { type: Number, default: 0 },
  /** Estado de paginacion controlado desde la vista: { page, rowsPerPage }. */
  paginacion: {
    type: Object,
    default: () => ({ page: 1, rowsPerPage: 20 }),
  },
});

const emit = defineEmits(["actualizar:paginacion", "peticion"]);

// Estado local del buscador. Solo tiene sentido en modo cliente: en modo
// servidor se oculta (ver comentario de arriba).
const busqueda = ref("");

/**
 * q-table dispara "@request" con { pagination, filter, getCellValue } cada vez
 * que el usuario cambia de pagina o de orden EN MODO SERVIDOR (rows-number
 * puesto). Aqui se reenvia hacia arriba para que la vista pida al backend.
 */
const alPedirPagina = (payload) => {
  emit("actualizar:paginacion", payload.pagination);
  emit("peticion", payload.pagination);
};

// Slots que este componente ya resuelve por su cuenta; el resto se reenvia a
// q-table tal cual.
const slotsPropios = ["default", "top", "no-data", "acciones-tabla"];
const slots = useSlots();
const slotsReenviados = computed(() =>
  Object.keys(slots).filter((nombre) => !slotsPropios.includes(nombre))
);
</script>

<template>
  <q-table
    :rows="filas"
    :columns="columnas"
    :row-key="filaClave"
    :loading="cargando"
    :filter="modoServidor ? undefined : busqueda"
    :pagination="paginacion"
    :rows-number="modoServidor ? filasTotales : undefined"
    :rows-per-page-options="modoServidor ? [10, 20, 50, 100] : [10, 25, 50, 0]"
    :no-data-label="mensajeVacio"
    no-results-label="Ningun registro coincide con la busqueda"
    loading-label="Consultando al servidor..."
    rows-per-page-label="Registros por pagina"
    flat
    bordered
    class="tabla-datos my-sticky-header-table"
    @request="modoServidor ? alPedirPagina : undefined"
    @update:pagination="!modoServidor ? (val) => emit('actualizar:paginacion', val) : undefined"
  >
    <template #top>
      <div class="row full-width items-center q-col-gutter-sm">
        <div v-if="!modoServidor" class="col-12 col-sm-5">
          <q-input v-model="busqueda" dense outlined clearable debounce="300" placeholder="Buscar...">
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <q-space class="gt-xs" />

        <div class="col-12 col-sm-auto">
          <slot name="acciones-tabla" />
        </div>
      </div>
    </template>

    <template v-for="nombre in slotsReenviados" :key="nombre" #[nombre]="datosDelSlot">
      <slot :name="nombre" v-bind="datosDelSlot || {}" />
    </template>

    <template #no-data>
      <div class="full-width column flex-center q-py-xl">
        <q-icon name="inbox" size="64px" color="grey-4" class="q-mb-sm" />
        <span class="empty-title">{{ mensajeVacio }}</span>
      </div>
    </template>
  </q-table>
</template>

<style scoped lang="scss">
.tabla-datos {
  border-radius: 8px;
}
</style>
