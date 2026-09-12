<template>
  <q-page class="flex flex-center">
    <q-card class="columna-login tarjeta-acceso" bordered>
      <q-card-section class="text-center">
        <q-icon name="inventory_2" color="primary" size="48px" />
        <div class="text-h5 q-mt-sm">Catálogo</div>
        <div class="text-caption text-grey">Inicia sesión para continuar</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="iniciarSesion" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Correo"
            outlined
            :rules="[(v) => !!v || 'Requerido']"
          />
          <q-input
            v-model="password"
            :type="mostrarPassword ? 'text' : 'password'"
            label="Contraseña"
            outlined
            :rules="[(v) => !!v || 'Requerido']"
          >
            <template #append>
              <q-icon
                :name="mostrarPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="mostrarPassword = !mostrarPassword"
              />
            </template>
          </q-input>

          <q-banner v-if="error" class="bg-red-1 text-red-9" dense rounded>
            {{ error }}
          </q-banner>

          <q-btn
            type="submit"
            label="Ingresar"
            color="primary"
            class="full-width"
            :loading="cargando"
            unelevated
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const mostrarPassword = ref(false);
const cargando = ref(false);
const error = ref('');

async function iniciarSesion() {
  cargando.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    });
    localStorage.setItem('token', data.token);
    // El backend solo devuelve { token }; el payload del JWT trae sub y rol.
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    localStorage.setItem('usuario', JSON.stringify({ email: email.value, rol: payload.rol }));
    router.push('/productos');
  } catch (err) {
    error.value = err.response?.data?.error?.mensaje || 'Credenciales inválidas';
  } finally {
    cargando.value = false;
  }
}
</script>

<style scoped>
.columna-login {
  width: 400px;
  max-width: 92vw;
}
.tarjeta-acceso {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
