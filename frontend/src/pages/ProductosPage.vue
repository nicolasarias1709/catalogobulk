<template>
  <q-page class="q-pa-md catalogo-publico" v-if="!haySesion">
    <div class="text-center q-mb-lg">
      <div class="text-h4 text-weight-bold">Catálogo</div>
      <div class="titulo-linea" />
    </div>

    <div class="row q-col-gutter-md justify-center q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filtroCategoria"
          :options="opcionesCategoria"
          label="Todas las categorías"
          outlined dense emit-value map-options
          @update:model-value="cargar"
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filtroDisponible"
          :options="[
            { label: 'Disponibilidad: todos', value: null },
            { label: 'Solo disponibles', value: 'true' },
            { label: 'Solo agotados', value: 'false' },
          ]"
          label="Disponibilidad: todos"
          outlined dense emit-value map-options
          @update:model-value="cargar"
        />
      </div>
    </div>

    <q-banner v-if="error" class="bg-red-1 text-red-9 q-mb-lg" rounded>
      <template #avatar><q-icon name="error" color="negative" /></template>
      {{ error }}
      <template #action>
        <q-btn flat color="negative" label="Reintentar" @click="cargar" />
      </template>
    </q-banner>

    <div v-if="!error && !cargando && productos.length === 0" class="text-center text-grey q-mt-xl">
      <q-icon name="inventory_2" size="64px" color="grey-4" />
      <div class="q-mt-sm">No hay productos que coincidan con estos filtros</div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6 col-md-4" v-for="producto in productos" :key="producto._id">
        <q-card class="tarjeta" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">{{ producto.nombre }}</div>
            <div class="text-caption text-grey">{{ producto.categoria }}</div>
          </q-card-section>
          <q-card-section class="row items-center justify-between">
            <div class="text-h6">${{ producto.precio }}</div>
            <q-badge :color="producto.disponible ? 'positive' : 'grey'">
              {{ producto.disponible ? 'Disponible' : 'Agotado' }}
            </q-badge>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>

  <!-- Vista de administración (con sesión iniciada): tabla editable -->
  <q-page class="q-pa-md" v-else>
    <EncabezadoPagina
      titulo="Productos"
      subtitulo="Catálogo de productos, precio y disponibilidad"
      icono="inventory"
    />

    <q-card class="tarjeta q-mb-md" flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-input
          v-model="filtroCategoria"
          dense outlined label="Filtrar por categoría"
          class="col-grow"
          @keyup.enter="cargar"
        />
        <q-btn color="primary" icon="add" label="Nuevo producto" @click="abrirNuevo" />
      </q-card-section>
    </q-card>

    <q-card class="tarjeta" flat bordered>
      <q-table
        class="tabla-datos"
        :rows="productos"
        :columns="columnas"
        row-key="_id"
        :loading="cargando"
        :pagination="paginacion"
        @request="onRequest"
      >
        <template #body-cell-disponible="props">
          <q-td :props="props">
            <q-badge :color="props.row.disponible ? 'positive' : 'grey'">
              {{ props.row.disponible ? 'Disponible' : 'Agotado' }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-acciones="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" @click="editar(props.row)" />
            <q-btn flat dense round icon="delete" color="negative" @click="eliminar(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogoAbierto">
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ editando ? 'Editar producto' : 'Nuevo producto' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.sku" label="SKU" outlined dense />
          <q-input v-model="form.nombre" label="Nombre" outlined dense />
          <q-input v-model.number="form.precio" type="number" label="Precio" outlined dense />
          <q-input v-model.number="form.stock" type="number" label="Stock" outlined dense />
          <q-input v-model="form.categoria" label="Categoría" outlined dense />
          <q-input v-model="form.proveedorId" label="ID del proveedor" outlined dense />
          <q-input v-model="form.descripcion" label="Descripción" outlined dense type="textarea" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" :loading="guardando" @click="guardar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import api from '../services/api';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';

const haySesion = !!localStorage.getItem('token');

const productos = ref([]);
const cargando = ref(false);
const error = ref('');
const filtroCategoria = ref(null);
const filtroDisponible = ref(null);
const opcionesCategoria = ref([{ label: 'Todas las categorías', value: null }]);

const dialogoAbierto = ref(false);
const editando = ref(false);
const guardando = ref(false);
const form = ref({});
const paginacion = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columnas = [
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left' },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'precio', label: 'Precio', field: (r) => `$${r.precio}`, align: 'right' },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'right' },
  { name: 'categoria', label: 'Categoría', field: 'categoria', align: 'left' },
  { name: 'disponible', label: 'Estado', field: 'disponible', align: 'center' },
  { name: 'acciones', label: '', field: 'acciones', align: 'center' },
];

async function cargarCategorias() {
  try {
    const { data } = await api.get('/categorias');
    const lista = Array.isArray(data) ? data : (data.data ?? []);
    opcionesCategoria.value = [
      { label: 'Todas las categorías', value: null },
      ...lista.map((c) => ({ label: c.nombre, value: c.slug ?? c.nombre })),
    ];
  } catch (err) {
    // el filtro de categoría simplemente queda vacío si esto falla
  }
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/productos', {
      params: {
        page: paginacion.value.page,
        limit: paginacion.value.rowsPerPage,
        categoria: (haySesion ? filtroCategoria.value : filtroCategoria.value) || undefined,
        disponible: filtroDisponible.value ?? undefined,
        incluirInactivos: haySesion || undefined,
      },
    });
    productos.value = data.data ?? [];
    paginacion.value.rowsNumber = data.total ?? productos.value.length;
  } catch (err) {
    error.value = 'No hay conexion con el servidor. ¿Esta corriendo el backend? ¿Tiene CORS habilitado?';
  } finally {
    cargando.value = false;
  }
}

function onRequest(props) {
  paginacion.value.page = props.pagination.page;
  paginacion.value.rowsPerPage = props.pagination.rowsPerPage;
  cargar();
}

function abrirNuevo() {
  editando.value = false;
  form.value = { sku: '', nombre: '', precio: 0, stock: 0, categoria: '', proveedorId: '', descripcion: '' };
  dialogoAbierto.value = true;
}

function editar(producto) {
  editando.value = true;
  form.value = { ...producto };
  dialogoAbierto.value = true;
}

async function guardar() {
  guardando.value = true;
  try {
    if (editando.value) {
      await api.put(`/productos/${form.value._id}`, form.value);
    } else {
      await api.post('/productos', form.value);
    }
    dialogoAbierto.value = false;
    Notify.create({ type: 'positive', message: 'Producto guardado' });
    cargar();
  } catch (err) {
    Notify.create({ type: 'negative', message: err.response?.data?.error?.mensaje || 'Error al guardar' });
  } finally {
    guardando.value = false;
  }
}

function eliminar(producto) {
  Dialog.create({
    title: 'Eliminar producto',
    message: `¿Eliminar "${producto.nombre}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/productos/${producto._id}`);
      Notify.create({ type: 'positive', message: 'Producto eliminado' });
      cargar();
    } catch (err) {
      Notify.create({ type: 'negative', message: 'No se pudo eliminar' });
    }
  });
}

onMounted(() => {
  if (!haySesion) cargarCategorias();
  cargar();
});
</script>

<style scoped>
.titulo-linea {
  width: 120px;
  height: 3px;
  background: var(--q-primary);
  margin: 8px auto 0;
}
</style>
