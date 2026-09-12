<template>
  <q-page class="q-pa-md">
    <EncabezadoPagina
      titulo="Proveedores"
      subtitulo="Empresas que suministran los productos del catálogo"
      icono="local_shipping"
    />

    <q-card class="tarjeta q-mb-md" flat bordered>
      <q-card-section class="row items-center">
        <q-btn color="primary" icon="add" label="Nuevo proveedor" @click="abrirNuevo" />
      </q-card-section>
    </q-card>

    <q-card class="tarjeta" flat bordered>
      <q-table
        class="tabla-datos"
        :rows="proveedores"
        :columns="columnas"
        row-key="_id"
        :loading="cargando"
        :pagination="paginacion"
        @request="onRequest"
      >
        <template #body-cell-activo="props">
          <q-td :props="props">
            <q-badge :color="props.row.activo ? 'positive' : 'grey'">
              {{ props.row.activo ? 'Activo' : 'Inactivo' }}
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
          <div class="text-h6">{{ editando ? 'Editar proveedor' : 'Nuevo proveedor' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.nombre" label="Nombre" outlined dense />
          <q-input v-model="form.slug" label="Slug" outlined dense hint="minúsculas-sin-espacios" />
          <q-input v-model="form.contactoEmail" label="Email de contacto" outlined dense />
          <q-input v-model="form.logoUrl" label="URL del logo" outlined dense />
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

const proveedores = ref([]);
const cargando = ref(false);
const dialogoAbierto = ref(false);
const editando = ref(false);
const guardando = ref(false);
const form = ref({});
const paginacion = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left' },
  { name: 'contactoEmail', label: 'Contacto', field: 'contactoEmail', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center' },
  { name: 'acciones', label: '', field: 'acciones', align: 'center' },
];

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/proveedores', {
      params: { page: paginacion.value.page, limit: paginacion.value.rowsPerPage },
    });
    proveedores.value = data.data ?? [];
    paginacion.value.rowsNumber = data.total ?? proveedores.value.length;
  } catch (err) {
    Notify.create({ type: 'negative', message: 'No se pudieron cargar los proveedores' });
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
  form.value = { nombre: '', slug: '', contactoEmail: '', logoUrl: '' };
  dialogoAbierto.value = true;
}

function editar(proveedor) {
  editando.value = true;
  form.value = { ...proveedor };
  dialogoAbierto.value = true;
}

async function guardar() {
  guardando.value = true;
  try {
    if (editando.value) {
      await api.put(`/proveedores/${form.value._id}`, form.value);
    } else {
      await api.post('/proveedores', form.value);
    }
    dialogoAbierto.value = false;
    Notify.create({ type: 'positive', message: 'Proveedor guardado' });
    cargar();
  } catch (err) {
    Notify.create({ type: 'negative', message: err.response?.data?.error?.mensaje || 'Error al guardar' });
  } finally {
    guardando.value = false;
  }
}

function eliminar(proveedor) {
  Dialog.create({
    title: 'Eliminar proveedor',
    message: `¿Eliminar "${proveedor.nombre}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/proveedores/${proveedor._id}`);
      Notify.create({ type: 'positive', message: 'Proveedor eliminado' });
      cargar();
    } catch (err) {
      Notify.create({ type: 'negative', message: err.response?.data?.error?.mensaje || 'No se pudo eliminar' });
    }
  });
}

onMounted(cargar);
</script>
