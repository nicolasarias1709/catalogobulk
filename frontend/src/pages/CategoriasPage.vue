<template>
  <q-page class="q-pa-md">
    <EncabezadoPagina
      titulo="Categorías"
      subtitulo="Organiza el catálogo por categoría"
      icono="category"
    />

    <q-card class="tarjeta q-mb-md" flat bordered>
      <q-card-section class="row items-center">
        <q-btn color="primary" icon="add" label="Nueva categoría" @click="abrirNuevo" />
      </q-card-section>
    </q-card>

    <q-card class="tarjeta" flat bordered>
      <q-table
        class="tabla-datos"
        :rows="categorias"
        :columns="columnas"
        row-key="_id"
        :loading="cargando"
      >
        <template #body-cell-activo="props">
          <q-td :props="props">
            <q-badge :color="props.row.activo ? 'positive' : 'grey'">
              {{ props.row.activo ? 'Activa' : 'Inactiva' }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-acciones="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" @click="editar(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogoAbierto">
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ editando ? 'Editar categoría' : 'Nueva categoría' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.slug" label="Slug" outlined dense :disable="editando" />
          <q-input v-model="form.nombre" label="Nombre" outlined dense />
          <q-input v-model="form.descripcion" label="Descripción" outlined dense type="textarea" />
          <q-toggle v-model="form.activo" label="Activa" />
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
import { Notify } from 'quasar';
import api from '../services/api';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';

const categorias = ref([]);
const cargando = ref(false);
const dialogoAbierto = ref(false);
const editando = ref(false);
const guardando = ref(false);
const form = ref({});

const columnas = [
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left' },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center' },
  { name: 'acciones', label: '', field: 'acciones', align: 'center' },
];

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/categorias', { params: { incluirInactivos: true } });
    categorias.value = Array.isArray(data) ? data : (data.data ?? []);
  } catch (err) {
    Notify.create({ type: 'negative', message: 'No se pudieron cargar las categorías' });
  } finally {
    cargando.value = false;
  }
}

function abrirNuevo() {
  editando.value = false;
  form.value = { slug: '', nombre: '', descripcion: '', activo: true };
  dialogoAbierto.value = true;
}

function editar(categoria) {
  editando.value = true;
  form.value = { ...categoria };
  dialogoAbierto.value = true;
}

async function guardar() {
  guardando.value = true;
  try {
    if (editando.value) {
      await api.put(`/categorias/${form.value._id}`, form.value);
    } else {
      await api.post('/categorias', form.value);
    }
    dialogoAbierto.value = false;
    Notify.create({ type: 'positive', message: 'Categoría guardada' });
    cargar();
  } catch (err) {
    Notify.create({ type: 'negative', message: err.response?.data?.error?.mensaje || 'Error al guardar' });
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>
