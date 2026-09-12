<template>
  <q-page class="q-pa-md">
    <EncabezadoPagina
      titulo="Exportaciones"
      subtitulo="Descarga el catálogo actual como archivo"
      icono="download"
    />

    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-4" v-for="tipo in tipos" :key="tipo.valor">
        <q-card class="tarjeta tarjeta-exportar" flat bordered>
          <q-card-section>
            <q-icon :name="tipo.icono" color="primary" size="32px" />
            <div class="text-subtitle1 q-mt-sm">{{ tipo.etiqueta }}</div>
          </q-card-section>
          <q-card-section>
            <div class="selector-formato">
              <q-btn-toggle
                v-model="formato[tipo.valor]"
                spread
                no-caps
                toggle-color="primary"
                :options="[
                  { label: 'CSV', value: 'csv' },
                  { label: 'XLSX', value: 'xlsx' },
                ]"
              />
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              color="primary"
              icon="download"
              label="Descargar"
              :loading="descargando === tipo.valor"
              @click="descargar(tipo.valor)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { Notify } from 'quasar';
import api from '../services/api';
import EncabezadoPagina from '../components/EncabezadoPagina.vue';

const tipos = [
  { valor: 'productos', etiqueta: 'Productos', icono: 'inventory' },
  { valor: 'proveedores', etiqueta: 'Proveedores', icono: 'local_shipping' },
  { valor: 'categorias', etiqueta: 'Categorías', icono: 'category' },
];

const formato = ref({ productos: 'csv', proveedores: 'csv', categorias: 'csv' });
const descargando = ref(null);

async function descargar(tipo) {
  descargando.value = tipo;
  try {
    const { data } = await api.get('/exportaciones', {
      params: { tipo, formato: formato.value[tipo] },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tipo}.${formato.value[tipo]}`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    Notify.create({ type: 'negative', message: 'No se pudo generar la exportación' });
  } finally {
    descargando.value = null;
  }
}
</script>

<style scoped>
.selector-formato {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  max-width: 420px;
}
.tarjeta-exportar {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
