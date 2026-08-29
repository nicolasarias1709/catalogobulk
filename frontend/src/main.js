/**
 * main.js — punto de entrada de la aplicacion.
 *
 * Es el unico archivo que "arma" el proyecto: crea la app, le instala los
 * plugins (Pinia, Router, Quasar) y la monta en el <div id="app"> del index.html.
 *
 * Regla practica: si algo tiene que estar disponible en TODA la aplicacion, se
 * registra aqui. Si no, no.
 */
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import App from "./App.vue";
// El router se exporta con nombre, por eso va entre llaves.
import { router } from "./router";
import { instalarQuasar } from "./plugins/quasar";

// Los estilos propios van DESPUES de los de Quasar (que se importan dentro de
// plugins/quasar.js) para que las personalizaciones ganen.
import "./styles/main.scss";

const app = createApp(App);

// Pinia con el plugin de persistencia: los stores que declaren "persist: true"
// se guardan solos en localStorage y se recuperan al abrir la aplicacion.
// El plugin se registra ANTES de app.use(pinia), si no, no alcanza a enterarse
// de los stores.
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia); // estado global  -> /store
app.use(router); // navegacion    -> /router
instalarQuasar(app); // interfaz      -> /plugins/quasar.js

app.mount("#app");
