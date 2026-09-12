<template>
  <q-page class="q-pa-md">
    <EncabezadoPagina
      titulo="Importaciones"
      subtitulo="Sube un catálogo en CSV o JSON para importarlo en lote"
      icono="upload_file"
    />

    <q-banner class="bg-orange-1 text-orange-9 q-mb-md" dense rounded>
      <template #avatar><q-icon name="warning" /></template>
      El progreso se actualiza cada pocos segundos consultando el servidor (no en tiempo real).
      El worker que procesa estas importaciones debe estar corriendo en algún lugar
      (ver README del proyecto) — si no está encendido, el import se queda en "pending".
    </q-banner>

    <q-card class="tarjeta q-mb-md" flat bordered>
      <q-card-section class="q-gutter-md">
        <div class="row q-gutter-md items-center">
          <q-select
            v-model="form.tipo"
            :options="['productos', 'proveedores', 'categorias']"
            label="Tipo"
            outlined dense
            style="min-width: 180px"
          />
          <q-input
            v-if="form.tipo === 'productos'"
            v-model="form.proveedorId"
            label="ID del proveedor"
            outlined dense
            style="min-width: 240px"
          />
          <q-file
            v-model="archivo"
            label="Archivo (.csv o .json)"
            outlined dense
            accept=".csv,.json"
            style="min-width: 260px"
          />
          <q-btn color="primary" label="Subir e importar" :loading="subiendo" @click="subir" />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="tarjeta" flat bordered>
      <q-table
        class="tabla-datos"
        :rows="imports"
        :columns="columnas"
        row-key="_id"
        :loading="cargando"
      >
        <template #body-cell-estado="props">
          <q-td :props="props">
            <q-badge :color="colorEstado(props.row.estado)">{{ props.row.estado }}</q-badge>
          </q-td>
        </template>
        <template #body-cell-progreso="props">
          <q-td :props="props">
            <q-linear-progress
              :value="(props.row.procesados || 0) / (props.row.total || 1)"
              size="10px"
              color="primary"
              rounded
            />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Notify } from 'quasar';
import api from '../services/api';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';

const imports = ref([]);
const cargando = ref(false);
const subiendo = ref(false);
const archivo = ref(null);
const form = ref({ tipo: 'productos', proveedorId: '' });
let intervalo = null;

const columnas = [
  { name: 'archivoNombre', label: 'Archivo', field: 'archivoNombre', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
  { name: 'progreso', label: 'Progreso', field: 'progreso', align: 'left' },
  { name: 'exitosos', label: 'Éxitos', field: 'exitosos', align: 'right' },
  { name: 'fallidos', label: 'Fallidos', field: 'fallidos', align: 'right' },
];

function colorEstado(estado) {
  return { pending: 'grey', processing: 'blue', completed: 'positive', failed: 'negative' }[estado] || 'grey';
}

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/imports');
    imports.value = data.data ?? [];
  } catch (err) {
    Notify.create({ type: 'negative', message: 'No se pudieron cargar las importaciones' });
  } finally {
    cargando.value = false;
  }
}

async function subir() {
  if (!archivo.value) {
    Notify.create({ type: 'warning', message: 'Selecciona un archivo primero' });
    return;
  }
  subiendo.value = true;
  try {
    const fd = new FormData();
    fd.append('archivo', archivo.value);
    fd.append('tipo', form.value.tipo);
    if (form.value.tipo === 'productos') fd.append('proveedorId', form.value.proveedorId);

    await api.post('/imports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    Notify.create({ type: 'positive', message: 'Import encolado' });
    archivo.value = null;
    cargar();
  } catch (err) {
    Notify.create({ type: 'negative', message: err.response?.data?.error?.mensaje || 'Error al subir el archivo' });
  } finally {
    subiendo.value = false;
  }
}

onMounted(() => {
  cargar();
  // Sustituto de los sockets del proyecto original: aquí se refresca por
  // polling porque las funciones serverless de Vercel no soportan
  // WebSockets persistentes.
  intervalo = setInterval(cargar, 5000);
});
onUnmounted(() => clearInterval(intervalo));
</script>
