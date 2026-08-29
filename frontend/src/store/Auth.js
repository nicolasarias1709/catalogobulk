/**
 * @fileoverview /store/Auth.js
 * Store de la SESION: guarda el token de quien inicio sesion.
 *
 * Es el ejemplo perfecto de para que sirve un store global: el token lo necesita
 * el interceptor de axios (para mandarlo en cada peticion), el router (para
 * decidir quien entra) y el layout (para mostrar el rol y el boton de salir).
 * Tres archivos que no se conocen entre si leyendo el mismo dato.
 *
 * DIFERENCIA con el proyecto de referencia: alla POST /usuarios/login responde
 * { usuario, token } (el usuario ya viene completo). Aqui, POST /api/auth/login
 * responde SOLO { token } (ver helpers/auth.service.js del backend), asi que
 * no hay "usuario" que guardar tal cual. En vez de inventar un endpoint que el
 * backend no tiene, se decodifica el payload del JWT (sub, rol) con
 * /utils/jwt.js para poder mostrar algo en pantalla.
 *
 * PERSISTENCIA: el tercer argumento de defineStore son las OPCIONES del store.
 * Ahi va "persist: true", que activa pinia-plugin-persistedstate (registrado en
 * main.js). El plugin escribe el estado en localStorage con la clave "auth" y
 * lo vuelve a cargar solo al abrir la aplicacion. Por eso al recargar con F5 la
 * sesion sigue viva sin escribir una sola linea de localStorage a mano.
 */
import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { decodificarPayloadJWT } from "@/utils/jwt";

export const useAuthStore = defineStore(
  "auth",
  () => {
    // --- state --------------------------------------------------------------

    /** Token JWT que devolvio el backend al iniciar sesion. */
    const token = ref(null);

    // --- getters ------------------------------------------------------------

    /** ¿Hay sesion abierta? Lo usan el router y el layout. */
    const estaAutenticado = computed(() => !!token.value);

    /**
     * Payload decodificado del token ({ sub, rol, iat, exp }), o null si no
     * hay sesion. No es informacion verificada, solo lo que trae el JWT.
     */
    const payload = computed(() =>
      token.value ? decodificarPayloadJWT(token.value) : null
    );

    /** id del usuario logueado (viene en "sub" dentro del token). */
    const usuarioId = computed(() => payload.value?.sub ?? null);

    /** Rol del usuario logueado: "admin" o "user". */
    const rol = computed(() => payload.value?.rol ?? null);

    /** Texto para mostrar en la barra superior: no hay email en el token. */
    const nombreUsuario = computed(() =>
      rol.value ? `Sesion (${rol.value})` : "Invitado"
    );

    // --- actions ------------------------------------------------------------

    /**
     * Guarda lo que respondio POST /api/auth/login: { token }.
     * @param {{token: string}} respuesta
     */
    function guardarSesion(respuesta) {
      token.value = respuesta.token;
    }

    /**
     * Cierra la sesion. Al dejar el ref en null, el plugin actualiza solo el
     * localStorage: no hay que borrarlo a mano.
     */
    function cerrarSesion() {
      token.value = null;
    }

    return {
      token,
      estaAutenticado,
      usuarioId,
      rol,
      nombreUsuario,
      guardarSesion,
      cerrarSesion,
    };
  },
  {
    // Opciones del store. Sin esta linea, la sesion se perderia al recargar.
    persist: true,
  }
);
