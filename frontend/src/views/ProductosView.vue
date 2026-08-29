<script setup>
/**
 * /views/ProductosView.vue
 * CRUD completo de productos. Es el módulo más enredado de los tres porque:
 *
 *   1. Cada producto pertenece a un proveedor (proveedorId), así que el
 *      formulario necesita un <q-select> alimentado por GET /proveedores.
 *   2. El backend NO hace populate() de proveedorId al listar (ver
 *      repositories/producto.repository.js -> listar), así que cada fila
 *      llega solo con el id; para mostrar el NOMBRE del proveedor en la
 *      tabla, se arma aquí un mapa id -> nombre con los proveedores ya
 *      cargados para el <q-select>.
 *   3. "disponible" NO se manda nunca: el backend lo calcula solo a partir
 *      del stock (producto.model.js -> pre('validate')), así que en el
 *      formulario se muestra como informativo, no como campo editable.
 *
 * Paginación de SERVIDOR + filtros: GET /api/productos acepta page, limit,
 * categoria, proveedor, disponible como query params (ver
 * routes/producto.routes.js). Cambiar un filtro vuelve a pedir la página 1.
 */
import { computed, onMounted, ref } from "vue";

import EncabezadoPagina from "@/components/Encabezados/EncabezadoPagina.vue";
import TablaDatos from "@/components/Tables/TablaDatos.vue";

import { get, post, put, del } from "@/services/api.service";
import { useGeneralStore } from "@/store/General";
import { useNotificar } from "@/composables/useNotificar";
import { useConfirmar } from "@/composables/useConfirmar";
import { formatDate } from "@/utils/formatDate";
import {
  requerido,
  minimo,
  maximo,
  numeroMinimo,
  entero,
  seleccionRequerida,
  urlOpcional,
} from "@/utils/reglas";

const general = useGeneralStore();
const { notificarOk, notificarError } = useNotificar();
const { confirmar } = useConfirmar();

// --- Tabla -------------------------------------------------------------
const columnas = [
  { name: "sku", label: "SKU", field: "sku", align: "left", sortable: true },
  { name: "nombre", label: "Nombre", field: "nombre", align: "left", sortable: true },
  { name: "categoria", label: "Categoría", field: "categoria", align: "left" },
  {
    name: "proveedor",
    label: "Proveedor",
    // field como función: busca el nombre en el mapa id -> nombre (ver abajo),
    // porque el backend no trae el proveedor completo, solo su id.
    field: (fila) => nombreProveedor(fila.proveedorId),
    align: "left",
  },
  {
    name: "precio",
    label: "Precio",
    field: "precio",
    align: "right",
    sortable: true,
    format: (v) => `$${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`,
  },
  { name: "stock", label: "Stock", field: "stock", align: "right", sortable: true },
  { name: "disponible", label: "Disponible", field: "disponible", align: "center" },
  { name: "acciones", label: "Acciones", field: "acciones", align: "right" },
];

// --- Estado de la pantalla -----------------------------------------------
const productos = ref([]);
const proveedores = ref([]); // alimenta el <q-select> y el mapa id -> nombre
const total = ref(0);
const cargando = ref(false);
const error = ref(null);

const paginacion = ref({ page: 1, rowsPerPage: 20 });

// Filtros (mismos nombres que acepta GET /api/productos).
const filtros = ref({ categoria: "", proveedor: "", disponible: null });

/** Opciones { label, value } para el <q-select> de proveedor, del formulario Y del filtro. */
const opcionesProveedores = computed(() =>
  proveedores.value.map((p) => ({ label: p.nombre, value: p._id }))
);

/** Nombre del proveedor a partir de su id, para pintar la columna de la tabla. */
const mapaProveedores = computed(() => {
  const mapa = {};
  proveedores.value.forEach((p) => {
    mapa[p._id] = p.nombre;
  });
  return mapa;
});
const nombreProveedor = (id) => mapaProveedores.value[id] || "—";

/** Trae UNA página de productos, aplicando los filtros y la paginación actuales. */
const cargar = async () => {
  cargando.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    params.set("page", paginacion.value.page);
    params.set("limit", paginacion.value.rowsPerPage);
    if (filtros.value.categoria) params.set("categoria", filtros.value.categoria);
    if (filtros.value.proveedor) params.set("proveedor", filtros.value.proveedor);
    if (filtros.value.disponible !== null) params.set("disponible", filtros.value.disponible);

    const respuesta = await get(`/productos?${params.toString()}`);
    productos.value = respuesta.data;
    total.value = respuesta.total;

    general.marcarSincronizacion();
  } catch (e) {
    error.value = e.mensaje;
    notificarError(e);
  } finally {
    cargando.value = false;
  }
};

/**
 * Al entrar se piden productos Y proveedores EN PARALELO: el segundo alimenta
 * el <q-select> del formulario y no depende del primero.
 */
onMounted(async () => {
  cargando.value = true;
  error.value = null;

  try {
    const [respuestaProductos, listaProveedores] = await Promise.all([
      get(`/productos?page=1&limit=${paginacion.value.rowsPerPage}`),
      get("/proveedores?limit=100"),
    ]);

    productos.value = respuestaProductos.data;
    total.value = respuestaProductos.total;
    proveedores.value = listaProveedores.data;

    general.marcarSincronizacion();
  } catch (e) {
    error.value = e.mensaje;
    notificarError(e);
  } finally {
    cargando.value = false;
  }
});

const alCambiarPagina = (nuevaPaginacion) => {
  paginacion.value = nuevaPaginacion;
  cargar();
};

const alCambiarFiltros = () => {
  paginacion.value.page = 1;
  cargar();
};

// Sin proveedores no se puede crear un producto: proveedorId es obligatorio.
const hayProveedores = computed(() => proveedores.value.length > 0);

// --- Formulario ------------------------------------------------------------
const dialogo = ref(false);
const guardando = ref(false);
const productoEditando = ref(null); // null = creando, objeto = editando
const formularioRef = ref(null);

const formularioVacio = () => ({
  sku: "",
  nombre: "",
  precio: null,
  stock: 0,
  categoria: "",
  descripcion: "",
  imagenUrl: "",
  proveedorId: null,
});

const formulario = ref(formularioVacio());
const esEdicion = computed(() => productoEditando.value !== null);

const abrirCreacion = () => {
  productoEditando.value = null;
  formulario.value = formularioVacio();
  dialogo.value = true;
};

const abrirEdicion = (producto) => {
  productoEditando.value = producto;
  formulario.value = {
    sku: producto.sku,
    nombre: producto.nombre,
    precio: producto.precio,
    stock: producto.stock,
    categoria: producto.categoria,
    descripcion: producto.descripcion || "",
    imagenUrl: producto.imagenUrl || "",
    proveedorId: producto.proveedorId,
  };
  dialogo.value = true;
};

const guardar = async () => {
  guardando.value = true;

  try {
    // "disponible" nunca se manda: el backend lo recalcula solo desde el
    // stock (producto.model.js -> pre('validate')). Mandarlo no haría nada,
    // así que ni se incluye.
    const datos = {
      sku: formulario.value.sku.trim().toUpperCase(),
      nombre: formulario.value.nombre.trim(),
      precio: Number(formulario.value.precio),
      stock: Number(formulario.value.stock),
      categoria: formulario.value.categoria.trim().toLowerCase(),
      descripcion: formulario.value.descripcion.trim() || null,
      imagenUrl: formulario.value.imagenUrl.trim() || null,
      proveedorId: formulario.value.proveedorId,
    };

    if (esEdicion.value) {
      await put(`/productos/${productoEditando.value._id}`, datos);
      notificarOk("Producto actualizado correctamente");
    } else {
      await post("/productos", datos);
      notificarOk("Producto creado correctamente");
    }

    dialogo.value = false;
    await cargar();
  } catch (e) {
    // Aquí caen, por ejemplo, 409 "sku duplicado" o 404 "proveedorId no
    // existe" (helpers/producto.service.js).
    notificarError(e);
  } finally {
    guardando.value = false;
  }
};

// --- Eliminar --------------------------------------------------------------
const eliminar = async (producto) => {
  const aceptado = await confirmar({
    titulo: "Eliminar producto",
    mensaje: `¿Eliminar definitivamente "${producto.nombre}" (${producto.sku})? Esta acción no se puede deshacer.`,
    textoOk: "Eliminar",
    color: "negative",
  });

  if (!aceptado) return;

  try {
    await del(`/productos/${producto._id}`);
    notificarOk("Producto eliminado");
    await cargar();
  } catch (e) {
    notificarError(e);
  }
};
</script>

<template>
  <q-page>
    <div class="contenedor-app">
      <EncabezadoPagina
        titulo="Productos"
        subtitulo="Catálogo de productos por proveedor y categoría"
        icono="inventory_2"
      >
        <template #acciones>
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="add"
            label="Nuevo producto"
            :disable="!hayProveedores"
            @click="abrirCreacion"
          />
        </template>
      </EncabezadoPagina>

      <q-banner
        v-if="!hayProveedores && !cargando"
        dense
        class="bg-orange-1 text-orange-9 q-mb-md rounded-borders"
      >
        <template #avatar>
          <q-icon name="warning_amber" />
        </template>
        No hay proveedores registrados. Crea primero un proveedor, porque todo
        producto debe pertenecer a uno.
        <template #action>
          <q-btn flat dense no-caps label="Ir a proveedores" :to="{ name: 'proveedores' }" />
        </template>
      </q-banner>

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
        :filas="productos"
        :filas-totales="total"
        :columnas="columnas"
        :cargando="cargando"
        :paginacion="paginacion"
        mensaje-vacio="Aún no hay productos en el catálogo"
        @peticion="alCambiarPagina"
      >
        <template #acciones-tabla>
          <div class="row q-gutter-sm items-center">
            <q-input
              v-model="filtros.categoria"
              dense
              outlined
              clearable
              debounce="400"
              placeholder="Filtrar por categoría"
              style="width: 180px"
              @update:model-value="alCambiarFiltros"
            />

            <q-select
              v-model="filtros.proveedor"
              dense
              outlined
              clearable
              emit-value
              map-options
              placeholder="Filtrar por proveedor"
              style="width: 200px"
              :options="opcionesProveedores"
              @update:model-value="alCambiarFiltros"
            />

            <q-btn-toggle
              v-model="filtros.disponible"
              dense
              no-caps
              unelevated
              toggle-color="primary"
              color="white"
              text-color="grey-8"
              :options="[
                { label: 'Todos', value: null },
                { label: 'Disponibles', value: 'true' },
                { label: 'Agotados', value: 'false' },
              ]"
              @update:model-value="alCambiarFiltros"
            />
          </div>
        </template>

        <template #body-cell-disponible="celda">
          <q-td :props="celda" class="text-center">
            <q-badge
              :color="celda.row.disponible ? 'positive' : 'grey-6'"
              :label="celda.row.disponible ? 'Sí' : 'No'"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="celda">
          <q-td :props="celda" class="text-right">
            <q-btn flat dense round size="sm" icon="edit" color="primary" class="action-secondary" @click="abrirEdicion(celda.row)">
              <q-tooltip>Editar</q-tooltip>
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
      <q-card class="dialog-card" style="width: 640px">
        <q-card-section class="bg-primary text-white row items-center no-wrap q-px-lg q-py-md">
          <q-icon :name="esEdicion ? 'edit' : 'add'" size="28px" class="q-mr-md" />
          <div>
            <div class="dialog-title">{{ esEdicion ? "Editar producto" : "Nuevo producto" }}</div>
            <div class="text-caption text-blue-2">Catálogo de productos</div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" color="white" />
        </q-card-section>

        <q-form ref="formularioRef" greedy @submit="guardar">
          <q-card-section class="q-gutter-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formulario.sku"
                  outlined
                  dense
                  label="SKU *"
                  hint="Único. Se guarda en mayúsculas"
                  :rules="[requerido('El SKU'), minimo(2, 'El SKU'), maximo(40, 'El SKU')]"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formulario.categoria"
                  outlined
                  dense
                  label="Categoría *"
                  hint="Se guarda en minúsculas (ej: electronica)"
                  :rules="[requerido('La categoría'), minimo(2, 'La categoría')]"
                  lazy-rules
                />
              </div>
            </div>

            <q-input
              v-model="formulario.nombre"
              outlined
              dense
              label="Nombre *"
              :rules="[requerido('El nombre'), minimo(1, 'El nombre')]"
              lazy-rules
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.precio"
                  outlined
                  dense
                  type="number"
                  step="0.01"
                  label="Precio *"
                  prefix="$"
                  :rules="[requerido('El precio'), numeroMinimo(0, 'El precio')]"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formulario.stock"
                  outlined
                  dense
                  type="number"
                  label="Stock *"
                  hint="Un entero. disponible se calcula solo a partir de este valor"
                  :rules="[requerido('El stock'), numeroMinimo(0, 'El stock'), entero('El stock')]"
                  lazy-rules
                />
              </div>
            </div>

            <q-select
              v-model="formulario.proveedorId"
              outlined
              dense
              emit-value
              map-options
              label="Proveedor *"
              :options="opcionesProveedores"
              :rules="[seleccionRequerida('un proveedor')]"
              lazy-rules
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No hay proveedores disponibles</q-item-section>
                </q-item>
              </template>
            </q-select>

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

            <q-banner v-if="esEdicion" dense class="bg-blue-1 text-primary rounded-borders">
              <template #avatar><q-icon name="info" /></template>
              Disponible actual:
              <q-badge
                :color="productoEditando.disponible ? 'positive' : 'grey-6'"
                :label="productoEditando.disponible ? 'Sí' : 'No'"
                class="q-ml-xs"
              />
              — se recalcula solo según el stock, no se edita aquí.
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn v-close-popup flat no-caps label="Cancelar" color="dark" class="btn-cancel" />
            <q-btn
              unelevated
              no-caps
              type="submit"
              color="primary"
              class="btn-ok"
              :label="esEdicion ? 'Guardar cambios' : 'Crear producto'"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
