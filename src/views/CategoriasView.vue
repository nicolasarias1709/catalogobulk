<script setup>
/**
 * /views/CategoriasView.vue
 *
 * A diferencia de Productos y Proveedores, esta vista NO tiene botón "Nueva
 * categoría" ni botón de eliminar: el backend no expone POST /api/categorias
 * ni DELETE (ver routes/categoria.routes.js). Las categorías se crean solas
 * cuando se importa un catálogo (el worker las genera a partir del campo
 * "categoria" de cada producto — ver repositories/categoria.repository.js,
 * función upsertPorSlug). Desde aquí solo se pueden "enriquecer" con nombre
 * bonito, descripción e imagen.
 *
 * GET /api/categorias no pagina (trae todas de una), así que esta vista sí usa
 * el modo CLIENTE de TablaDatos (el mismo patrón del proyecto de referencia).
 */
import { onMounted, ref } from "vue";

import EncabezadoPagina from "@/components/Encabezados/EncabezadoPagina.vue";
import TablaDatos from "@/components/Tables/TablaDatos.vue";

import { get, put } from "@/services/api.service";
import { useGeneralStore } from "@/store/General";
import { useNotificar } from "@/composables/useNotificar";
import { formatDate } from "@/utils/formatDate";
import { requerido, minimo, maximo, urlOpcional } from "@/utils/reglas";

const general = useGeneralStore();
const { notificarOk, notificarError } = useNotificar();

const columnas = [
  { name: "slug", label: "Slug", field: "slug", align: "left", sortable: true },
  { name: "nombre", label: "Nombre visible", field: "nombre", align: "left", sortable: true },
  { name: "descripcion", label: "Descripción", field: "descripcion", align: "left" },
  {
    name: "createdAt",
    label: "Creada",
    field: "createdAt",
    align: "left",
    sortable: true,
    format: (v) => formatDate(v),
  },
  { name: "acciones", label: "Acciones", field: "acciones", align: "right" },
];

const categorias = ref([]);
const cargando = ref(false);
const error = ref(null);

const cargar = async () => {
  cargando.value = true;
  error.value = null;

  try {
    categorias.value = await get("/categorias");
    general.marcarSincronizacion();
  } catch (e) {
    error.value = e.mensaje;
    notificarError(e);
  } finally {
    cargando.value = false;
  }
};

onMounted(cargar);

// --- Formulario de edición (no hay creación) ------------------------------
const dialogo = ref(false);
const guardando = ref(false);
const categoriaEditando = ref(null);
const formularioRef = ref(null);

const formulario = ref({ nombre: "", descripcion: "", imagenUrl: "" });

const abrirEdicion = (categoria) => {
  categoriaEditando.value = categoria;
  formulario.value = {
    nombre: categoria.nombre,
    descripcion: categoria.descripcion || "",
    imagenUrl: categoria.imagenUrl || "",
  };
  dialogo.value = true;
};

const guardar = async () => {
  guardando.value = true;

  try {
    const datos = {
      nombre: formulario.value.nombre.trim(),
      descripcion: formulario.value.descripcion.trim() || null,
      imagenUrl: formulario.value.imagenUrl.trim() || null,
    };

    // El slug NUNCA se manda: aunque se enviara, el backend lo ignora
    // (helpers/categoria.service.js -> actualizarCategoria lo descarta).
    await put(`/categorias/${categoriaEditando.value._id}`, datos);

    notificarOk("Categoría actualizada correctamente");
    dialogo.value = false;
    await cargar();
  } catch (e) {
    notificarError(e);
  } finally {
    guardando.value = false;
  }
};
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Categorías"
        subtitulo="Se crean solas al importar productos; aquí solo se enriquecen"
        icono="category"
      />

      <q-banner v-if="error" dense class="bg-red-1 text-negative q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="error_outline" />
        </template>
        {{ error }}
        <template #action>
          <q-btn flat dense no-caps label="Reintentar" @click="cargar" />
        </template>
      </q-banner>

      <TablaDatos
        :filas="categorias"
        :columnas="columnas"
        :cargando="cargando"
        mensaje-vacio="Aún no hay categorías. Se crean solas al importar productos."
      >
        <template #body-cell-descripcion="celda">
          <q-td :props="celda">
            {{ celda.row.descripcion || "—" }}
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="edit" color="primary" class="action-secondary" @click="abrirEdicion(celda.row)">
              <q-tooltip>Enriquecer</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- ===================== FORMULARIO DE ENRIQUECIMIENTO ===================== -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon name="edit" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">Editar categoría</div>
            <div class="text-caption text-blue-2">slug: {{ categoriaEditando?.slug }}</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-banner dense class="bg-blue-1 text-primary rounded-borders">
              <template #avatar><q-icon name="info" /></template>
              El slug no se edita aquí: lo usan los productos ya importados para
              agruparse en esta categoría.
            </q-banner>

            <q-input
              v-model="formulario.nombre"
              outlined
              dense
              label="Nombre visible *"
              hint="Como se muestra al usuario final (el slug queda igual)"
              :rules="[requerido('El nombre'), minimo(2, 'El nombre'), maximo(80, 'El nombre')]"
              lazy-rules
            />

            <q-input
              v-model="formulario.descripcion"
              outlined
              dense
              type="textarea"
              autogrow
              label="Descripción"
              hint="Opcional"
            />

            <q-input
              v-model="formulario.imagenUrl"
              outlined
              dense
              label="URL de la imagen"
              hint="Opcional. Debe empezar por http:// o https://"
              :rules="[urlOpcional('La URL de la imagen')]"
              lazy-rules
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated
              no-caps
              type="submit"
              color="primary"
              class="btn-ok"
              label="Guardar cambios"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
