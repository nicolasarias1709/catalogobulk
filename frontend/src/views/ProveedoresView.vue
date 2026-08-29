<script setup>
/**
 * /views/ProveedoresView.vue
 * CRUD completo de proveedores contra el backend real.
 *
 * Recorrido: vista -> get/post/put/del (services/api.service.js) ->
 * plugins/axios.js -> backend (controller/proveedor.controller.js).
 *
 * Paginación de SERVIDOR: GET /api/proveedores devuelve
 * { data, page, limit, total }, no el arreglo completo. Por eso, a diferencia
 * de una tabla simple, aquí se vuelve a pedir al backend cada vez que
 * TablaDatos avisa (evento @peticion) que el usuario cambió de página.
 */
import { computed, onMounted, ref } from "vue";

import EncabezadoPagina from "@/components/Encabezados/EncabezadoPagina.vue";
import TablaDatos from "@/components/Tables/TablaDatos.vue";

import { get, post, put, del } from "@/services/api.service";
import { useGeneralStore } from "@/store/General";
import { useNotificar } from "@/composables/useNotificar";
import { useConfirmar } from "@/composables/useConfirmar";
import { formatDate } from "@/utils/formatDate";
import { requerido, minimo, maximo, esEmailOpcional, urlOpcional, patron } from "@/utils/reglas";

const general = useGeneralStore();
const { notificarOk, notificarError, notificarInfo } = useNotificar();
const { confirmar } = useConfirmar();

// --- Tabla -----------------------------------------------------------------
const columnas = [
  { name: "nombre", label: "Nombre", field: "nombre", align: "left", sortable: true },
  { name: "slug", label: "Slug", field: "slug", align: "left" },
  { name: "contactoEmail", label: "Contacto", field: "contactoEmail", align: "left" },
  {
    name: "createdAt",
    label: "Creado",
    field: "createdAt",
    align: "left",
    format: (v) => formatDate(v),
  },
  { name: "activo", label: "Estado", field: "activo", align: "center" },
  { name: "acciones", label: "Acciones", field: "acciones", align: "right" },
];

// --- Estado de la pantalla ---------------------------------------------
const proveedores = ref([]);
const total = ref(0);
const cargando = ref(false);
const error = ref(null);

// Estado de paginación que controla la vista (TablaDatos solo lo refleja).
const paginacion = ref({ page: 1, rowsPerPage: 20 });

// Filtro de estado (todos / solo activos / solo inactivos).
const filtroActivo = ref(null); // null = todos, true, false

/**
 * Trae UNA página de proveedores del servidor, con los parámetros actuales
 * de paginación y filtro.
 */
const cargar = async () => {
  cargando.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    params.set("page", paginacion.value.page);
    params.set("limit", paginacion.value.rowsPerPage);
    if (filtroActivo.value !== null) params.set("activo", filtroActivo.value);

    const respuesta = await get(`/proveedores?${params.toString()}`);
    proveedores.value = respuesta.data;
    total.value = respuesta.total;

    general.marcarSincronizacion();
  } catch (e) {
    error.value = e.mensaje;
    notificarError(e);
  } finally {
    cargando.value = false;
  }
};

onMounted(cargar);

/** Se llama cuando TablaDatos avisa que el usuario cambió de página/orden. */
const alCambiarPagina = (nuevaPaginacion) => {
  paginacion.value = nuevaPaginacion;
  cargar();
};

/** Se llama al cambiar el filtro de estado: siempre se vuelve a la página 1. */
const alCambiarFiltro = () => {
  paginacion.value.page = 1;
  cargar();
};

// --- Formulario ------------------------------------------------------------
const dialogo = ref(false);
const guardando = ref(false);
const proveedorEditando = ref(null); // null = creando, objeto = editando
const formularioRef = ref(null);

const formularioVacio = () => ({
  nombre: "",
  slug: "",
  contactoEmail: "",
  logoUrl: "",
});

const formulario = ref(formularioVacio());
const esEdicion = computed(() => proveedorEditando.value !== null);

// El slug se autogenera a partir del nombre mientras se crea (no en edición,
// para no cambiar una llave que ya usan productos existentes vía filtro).
const generarSlug = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const alEscribirNombre = () => {
  if (!esEdicion.value) {
    formulario.value.slug = generarSlug(formulario.value.nombre);
  }
};

const abrirCreacion = () => {
  proveedorEditando.value = null;
  formulario.value = formularioVacio();
  dialogo.value = true;
};

const abrirEdicion = (proveedor) => {
  proveedorEditando.value = proveedor;
  formulario.value = {
    nombre: proveedor.nombre,
    slug: proveedor.slug,
    contactoEmail: proveedor.contactoEmail || "",
    logoUrl: proveedor.logoUrl || "",
  };
  dialogo.value = true;
};

const guardar = async () => {
  guardando.value = true;

  try {
    const datos = {
      nombre: formulario.value.nombre.trim(),
      slug: formulario.value.slug.trim().toLowerCase(),
      contactoEmail: formulario.value.contactoEmail.trim() || null,
      logoUrl: formulario.value.logoUrl.trim() || null,
    };

    if (esEdicion.value) {
      await put(`/proveedores/${proveedorEditando.value._id}`, datos);
      notificarOk("Proveedor actualizado correctamente");
    } else {
      await post("/proveedores", datos);
      notificarOk("Proveedor creado correctamente");
    }

    dialogo.value = false;
    await cargar();
  } catch (e) {
    // Aquí cae, por ejemplo, 409 "nombre o slug duplicado" (helpers/proveedor.service.js)
    notificarError(e);
  } finally {
    guardando.value = false;
  }
};

// --- Activar / desactivar ----------------------------------------------
const cambiarEstado = async (proveedor) => {
  const activar = !proveedor.activo;

  const aceptado = await confirmar({
    titulo: activar ? "Activar proveedor" : "Desactivar proveedor",
    mensaje: `¿Confirmas ${activar ? "activar" : "desactivar"} a ${proveedor.nombre}?`,
    textoOk: activar ? "Activar" : "Desactivar",
    color: activar ? "primary" : "negative",
  });

  if (!aceptado) return;

  try {
    await put(`/proveedores/${proveedor._id}`, { activo: activar });
    notificarOk(`Proveedor ${activar ? "activado" : "desactivado"}`);
    await cargar();
  } catch (e) {
    notificarError(e);
  }
};

// --- Eliminar ------------------------------------------------------------
const eliminar = async (proveedor) => {
  const aceptado = await confirmar({
    titulo: "Eliminar proveedor",
    mensaje: `¿Eliminar definitivamente a ${proveedor.nombre}? Esta acción no se puede deshacer.`,
    textoOk: "Eliminar",
    color: "negative",
  });

  if (!aceptado) return;

  try {
    await del(`/proveedores/${proveedor._id}`);
    notificarOk("Proveedor eliminado");
    await cargar();
  } catch (e) {
    // El backend responde 409 si el proveedor tiene productos asociados
    // (helpers/proveedor.service.js -> eliminarProveedor). Se le explica al
    // usuario la alternativa real: desactivarlo en vez de borrarlo.
    if (e.status === 409) {
      notificarInfo("Tiene productos asociados: no se puede eliminar. Puedes desactivarlo en su lugar.");
    } else {
      notificarError(e);
    }
  }
};
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Proveedores"
        subtitulo="Empresas que surten el catálogo"
        icono="local_shipping"
      >
        <template #acciones>
          <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo proveedor" @click="abrirCreacion" />
        </template>
      </EncabezadoPagina>

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
        modo-servidor
        :filas="proveedores"
        :filas-totales="total"
        :columnas="columnas"
        :cargando="cargando"
        :paginacion="paginacion"
        mensaje-vacio="Aún no hay proveedores registrados"
        @peticion="alCambiarPagina"
      >
        <template #acciones-tabla>
          <q-btn-toggle
            v-model="filtroActivo"
            dense
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="grey-8"
            :options="[
              { label: 'Todos', value: null },
              { label: 'Activos', value: true },
              { label: 'Inactivos', value: false },
            ]"
            @update:model-value="alCambiarFiltro"
          />
        </template>

        <template #body-cell-contactoEmail="celda">
          <q-td :props="celda">
            {{ celda.row.contactoEmail || "—" }}
          </q-td>
        </template>

        <template #body-cell-activo="celda">
          <q-td :props="celda" class="text-center">
            <q-badge :color="celda.row.activo ? 'positive' : 'grey-6'" :label="celda.row.activo ? 'Activo' : 'Inactivo'" />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="edit" color="primary" class="action-secondary" @click="abrirEdicion(celda.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              size="sm"
              class="action-secondary"
              :icon="celda.row.activo ? 'toggle_on' : 'toggle_off'"
              :color="celda.row.activo ? 'negative' : 'positive'"
              @click="cambiarEstado(celda.row)"
            >
              <q-tooltip>{{ celda.row.activo ? "Desactivar" : "Activar" }}</q-tooltip>
            </q-btn>

            <q-btn flat dense round size="sm" icon="delete" color="negative" class="action-secondary" @click="eliminar(celda.row)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </TablaDatos>
    </div>

    <!-- ===================== FORMULARIO CREAR / EDITAR ===================== -->
    <q-dialog v-model="dialogo" persistent @show="formularioRef?.resetValidation()">
      <q-card class="dialog-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon :name="esEdicion ? 'edit' : 'add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? "Editar proveedor" : "Nuevo proveedor" }}</div>
            <div class="text-caption text-blue-2">Empresas que surten el catálogo</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.nombre"
              outlined
              dense
              label="Nombre *"
              hint="Nombre comercial del proveedor"
              :rules="[requerido('El nombre'), minimo(2, 'El nombre'), maximo(120, 'El nombre')]"
              lazy-rules
              @update:model-value="alEscribirNombre"
            />

            <q-input
              v-model="formulario.slug"
              outlined
              dense
              label="Slug *"
              hint="Se usa en los filtros de productos. Minúsculas, sin espacios (ej: acme-corp)"
              :rules="[requerido('El slug'), patron(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')]"
              lazy-rules
              :readonly="esEdicion"
            >
              <template v-if="esEdicion" #append>
                <q-icon name="lock" size="16px">
                  <q-tooltip>El slug no se puede editar: lo usan los productos para filtrar</q-tooltip>
                </q-icon>
              </template>
            </q-input>

            <q-input
              v-model="formulario.contactoEmail"
              outlined
              dense
              type="email"
              label="Email de contacto"
              hint="Opcional"
              :rules="[esEmailOpcional()]"
              lazy-rules
            />

            <q-input
              v-model="formulario.logoUrl"
              outlined
              dense
              label="URL del logo"
              hint="Opcional. Debe empezar por http:// o https://"
              :rules="[urlOpcional('La URL del logo')]"
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
              :label="esEdicion ? 'Guardar cambios' : 'Crear proveedor'"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
