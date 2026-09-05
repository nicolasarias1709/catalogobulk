/**
 * @fileoverview /store/General.js
 * Store GLOBAL de interfaz: lo que no pertenece a ningun modelo del backend
 * pero varias pantallas necesitan compartir (menu lateral, titulo, hora de la
 * ultima carga de datos).
 *
 * Escrito con COMPOSITION API ("setup store"): en vez de pasarle a defineStore
 * un objeto con state/getters/actions, se le pasa una FUNCION, igual que el
 * <script setup> de un componente.
 */
import { computed, ref } from "vue";
import { defineStore } from "pinia";

export const useGeneralStore = defineStore("general", () => {
  // --- state ------------------------------------------------------------

  // El titulo viene del .env para no tenerlo repetido por toda la app.
  const titulo = ref(import.meta.env.VITE_APP_TITULO || "CatalogoBulk");

  // Si el menu lateral esta abierto (lo controla el boton de hamburguesa).
  const menuAbierto = ref(false);

  // Hora de la ultima vez que ALGUNA vista trajo datos frescos del backend.
  // Es informativo (se muestra chico, en la barra superior); no dispara nada.
  const ultimaSincronizacion = ref(null);

  // --- getters ------------------------------------------------------------

  /** URL de la API que se esta usando. Util para depurar. */
  const urlApi = computed(() => import.meta.env.VITE_API_URL);

  // --- actions ------------------------------------------------------------

  /** Abre o cierra el menu lateral. */
  function alternarMenu() {
    menuAbierto.value = !menuAbierto.value;
  }

  /** Cualquier vista la llama justo después de traer datos con éxito. */
  function marcarSincronizacion() {
    ultimaSincronizacion.value = new Date();
  }

  return {
    titulo,
    menuAbierto,
    ultimaSincronizacion,
    urlApi,
    alternarMenu,
    marcarSincronizacion,
  };
});
