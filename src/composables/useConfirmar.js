/**
 * @fileoverview /composables/useConfirmar.js
 * Convierte el dialogo de Quasar (que funciona con callbacks .onOk/.onCancel)
 * en una Promesa, para poder escribir codigo lineal:
 *
 *   if (await confirmar({ titulo: "...", mensaje: "..." })) { ...borrar... }
 *
 * Sin este composable, cada pantalla tendria que repetir el $q.dialog completo.
 */
import { useQuasar } from "quasar";

export function useConfirmar() {
  const $q = useQuasar();

  /**
   * Muestra un dialogo de confirmacion.
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} opciones.mensaje
   * @param {string} [opciones.textoOk="Confirmar"]
   * @param {string} [opciones.color="primary"]
   * @returns {Promise<boolean>} true si el usuario acepto
   */
  const confirmar = ({ titulo, mensaje, textoOk = "Confirmar", color = "primary" }) =>
    new Promise((resolve) => {
      $q.dialog({
        title: titulo,
        message: mensaje,
        ok: { label: textoOk, color, unelevated: true },
        cancel: { label: "Cancelar", flat: true, color: "grey-8" },
        persistent: true,
      })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false));
    });

  return { confirmar };
}
