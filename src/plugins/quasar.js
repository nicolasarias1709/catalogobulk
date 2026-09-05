/**
 * @fileoverview /plugins/quasar.js
 * Registro y configuracion de Quasar como plugin de Vue.
 *
 * Aqui se declaran los "Quasar Plugins" (Notify, Dialog, Loading). Si un plugin
 * no se declara en esta lista, this.$q.notify() falla en tiempo de ejecucion.
 */
import { Quasar, Notify, Dialog, Loading } from "quasar";

// Iconos y estilos base de Quasar.
import "@quasar/extras/material-icons/material-icons.css";
import "quasar/src/css/index.sass";

// Idioma espanol para textos internos (paginacion de tablas, botones de dialogos...)
import lang from "quasar/lang/es";

/**
 * Instala Quasar en la instancia de Vue.
 * @param {import("vue").App} app - instancia creada con createApp()
 */
export function instalarQuasar(app) {
  app.use(Quasar, {
    plugins: { Notify, Dialog, Loading },
    lang,
    config: {
      // Configuracion por defecto de cada notificacion: se define una vez aqui
      // y no hay que repetirla en cada llamada a notify().
      notify: {
        position: "top-right",
        timeout: 3000,
        actions: [{ icon: "close", color: "white", round: true }],
      },
    },
  });
}
