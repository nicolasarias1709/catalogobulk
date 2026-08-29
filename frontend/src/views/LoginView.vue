<script setup>
/**
 * /views/LoginView.vue
 * Pantalla de inicio de sesion. Es la RAIZ de la aplicacion ("/"): la primera
 * que ve cualquiera, porque sin token la API no entrega ni un dato.
 *
 * El recorrido completo del token:
 *
 *   1. Esta vista manda email y contraseña a POST /api/auth/login.
 *   2. El backend responde { token } (a diferencia del backend de referencia,
 *      aqui NO viene un objeto "usuario"; ver store/Auth.js para el porque).
 *   3. Se guarda en el store Auth, que gracias a persist lo escribe en localStorage.
 *   4. De ahi en adelante, /plugins/axios.js lo manda en la cabecera
 *      "Authorization: Bearer <token>" de TODAS las peticiones.
 *
 * OJO con el <div> de afuera: esta pantalla NO va dentro de un layout, asi que
 * aqui no se puede usar <q-page>. Un q-page necesita estar dentro de un
 * <q-layout> para renderizarse; sin el, la pantalla saldria en blanco.
 */
import { ref } from "vue";
import { useRouter } from "vue-router";

import { post } from "@/services/api.service";
import { useAuthStore } from "@/store/Auth";
import { useGeneralStore } from "@/store/General";
import { useNotificar } from "@/composables/useNotificar";
import { requerido, esEmail, minimo } from "@/utils/reglas";
import logo from "@/assets/logo.svg";

const router = useRouter();
const auth = useAuthStore();
const general = useGeneralStore();
const { notificarOk, notificarError } = useNotificar();

const formulario = ref({ email: "", password: "" });
const verPassword = ref(false);
const enviando = ref(false);

/**
 * Se ejecuta solo si todas las rules pasaron (de eso se encarga <q-form @submit>).
 */
const iniciarSesion = async () => {
  enviando.value = true;

  try {
    const respuesta = await post("/auth/login", {
      email: formulario.value.email.trim(),
      password: formulario.value.password,
    });

    // El store guarda { token }; el plugin de persistencia lo escribe solo.
    auth.guardarSesion(respuesta);

    notificarOk("Sesion iniciada correctamente");
    router.push({ name: "dashboard" });
  } catch (e) {
    // El backend responde 401 con "Credenciales inválidas" (ver
    // helpers/auth.service.js) o 429 si se agoto el rate limit del login.
    notificarError(e);
  } finally {
    enviando.value = false;
  }
};
</script>

<template>
  <!-- window-height = 100vh; flex flex-center centra en los dos ejes. -->
  <div class="window-height flex flex-center q-pa-md">
    <div class="columna-login">
      <q-card flat class="tarjeta" bordered>
        <q-card-section class="text-center q-pb-none">
          <img :src="logo" alt="Logo" width="56" height="56" />
          <div class="text-h6 text-weight-bold q-mt-sm">{{ general.titulo }}</div>
          <p class="texto-suave text-body2">
            Inicia sesion para gestionar el catalogo.
          </p>
        </q-card-section>

        <q-form greedy @submit="iniciarSesion">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="formulario.email"
              outlined
              dense
              type="email"
              label="Email *"
              autocomplete="email"
              autofocus
              :rules="[requerido('El email'), esEmail()]"
              lazy-rules
            >
              <template #prepend>
                <q-icon name="mail" />
              </template>
            </q-input>

            <q-input
              v-model="formulario.password"
              outlined
              dense
              label="Contraseña *"
              autocomplete="current-password"
              :type="verPassword ? 'text' : 'password'"
              :rules="[requerido('La contraseña'), minimo(6, 'La contraseña')]"
              lazy-rules
            >
              <template #prepend>
                <q-icon name="lock" />
              </template>
              <template #append>
                <q-icon
                  :name="verPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="verPassword = !verPassword"
                />
              </template>
            </q-input>
          </q-card-section>

          <q-card-actions class="q-px-md q-pb-md">
            <q-btn
              unelevated
              no-caps
              type="submit"
              color="primary"
              class="full-width"
              label="Entrar"
              :loading="enviando"
            />
          </q-card-actions>
        </q-form>

        <q-separator />

        <q-card-section class="text-caption texto-suave">
          <q-icon name="info" size="14px" class="q-mr-xs" />
          Este backend no trae un usuario de ejemplo (no hay <code>npm run seed</code>).
          Crea el primero con <code>POST /api/auth/register</code> antes de entrar
          aqui — el paso a paso esta en el README del frontend.
        </q-card-section>
      </q-card>

      <!-- Recordatorio de a que backend apunta: ahorra media clase de
           depuracion cuando el aprendiz apunta al puerto equivocado. -->
      <p class="text-center text-caption texto-suave q-mt-md q-mb-none">
        <q-icon name="dns" size="14px" class="q-mr-xs" />{{ general.urlApi }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.columna-login {
  width: 400px;
  max-width: 92vw;
}

code {
  background: #f1f3f5;
  border-radius: 4px;
  padding: 1px 5px;
}
</style>
