/**
 * @fileoverview /composables/useNotificar.js
 * Composable = funcion que empieza por "use" y encapsula logica reutilizable de
 * la Composition API. Solo se puede llamar DENTRO de <script setup> (o de otro
 * composable), porque usa useQuasar(), que necesita el contexto del componente.
 *
 * Centraliza como se le avisa al usuario, para que todas las pantallas
 * muestren los mensajes igual.
 */
import { useQuasar } from "quasar";

export function useNotificar() {
  const $q = useQuasar();

  /**
   * Mensaje de exito (verde).
   * @param {string} mensaje
   */
  const notificarOk = (mensaje) => {
    $q.notify({ type: "positive", message: mensaje, icon: "check_circle" });
  };

  /**
   * Mensaje de error (rojo).
   * Recibe el error YA normalizado por el interceptor de /plugins/axios.js:
   *   { status, mensaje, codigo }
   *
   * @param {{mensaje: string, codigo: string}|string} error
   */
  const notificarError = (error) => {
    if (typeof error === "string") {
      $q.notify({ type: "negative", message: error, icon: "error" });
      return;
    }

    $q.notify({
      type: "negative",
      icon: "error",
      message: error?.mensaje || "Ocurrio un error inesperado",
      caption: error?.codigo,
    });
  };

  /**
   * Aviso informativo (azul).
   * @param {string} mensaje
   */
  const notificarInfo = (mensaje) => {
    $q.notify({ type: "info", message: mensaje, icon: "info" });
  };

  return { notificarOk, notificarError, notificarInfo };
}
