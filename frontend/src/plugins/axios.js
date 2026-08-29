/**
 * @fileoverview /plugins/axios.js
 * UNA sola instancia de axios para toda la aplicacion.
 *
 * ¿Por que un plugin y no llamar a axios en cada componente?
 * Porque la URL del backend, las cabeceras y el manejo de errores se configuran
 * en UN solo lugar. Si mañana el backend cambia de puerto, se toca este archivo
 * y nada mas.
 *
 * Cadena de responsabilidad del proyecto:
 *   componente -> store (Pinia) -> service -> ESTE archivo -> backend
 *
 * OJO, diferencias con el backend "backend prueba" (el de referencia):
 *   - El token va en la cabecera "Authorization: Bearer <token>", NO en "x-token"
 *     (ver src/middlewares/auth.js del backend: header.startsWith("Bearer ")).
 *   - Los errores llegan como { error: { codigo, mensaje } }, NO como
 *     { msg, errors: [] } (ver src/middlewares/errorHandler.js del backend).
 */
import axios from "axios";

import { router } from "@/router";
import { useAuthStore } from "@/store/Auth";

const api = axios.create({
  // Nunca "quemar" la URL en el codigo: viene del .env (VITE_API_URL).
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // si el backend no responde en 10s, corta y avisa
});

/**
 * INTERCEPTOR DE PETICION: se ejecuta ANTES de que salga cada request.
 *
 * Aqui se inyecta el token en la cabecera Authorization, que es la que revisa
 * el middleware src/middlewares/auth.js del backend. Gracias a esto, ninguna
 * vista tiene que acordarse de mandar el token: se agrega solo a TODAS las
 * peticiones.
 *
 * useAuthStore() se llama DENTRO del interceptor, no arriba en el modulo,
 * porque en el momento en que se carga este archivo Pinia todavia no existe.
 */
api.interceptors.request.use((config) => {
  const auth = useAuthStore();

  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  return config;
});

/**
 * INTERCEPTOR DE RESPUESTA: se ejecuta al volver cada respuesta.
 * Normaliza el error para que los stores/vistas siempre reciban lo mismo:
 *   { status, mensaje, codigo }
 *
 * El backend de CatalogoBulk responde { error: { codigo, mensaje } }
 * (ver middlewares/errorHandler.js), distinto del { msg, errors: [] } del
 * backend de referencia. Se normaliza aqui para que ningun componente tenga
 * que saber ese detalle.
 */
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const data = error.response?.data;

    const errorNormalizado = {
      status: error.response?.status ?? 0,
      mensaje: data?.error?.mensaje || mensajeSegunFallo(error),
      codigo: data?.error?.codigo || "ERROR",
    };

    // 401 = "no se quien eres" (token no provisto, invalido o expirado, ver
    // middlewares/auth.js). Se cierra la sesion y se manda al login desde un
    // solo lugar, en vez de repetir esta revision en cada vista.
    if (errorNormalizado.status === 401) {
      cerrarSesionYSalir();
    }

    return Promise.reject(errorNormalizado);
  }
);

/**
 * Limpia la sesion y navega al login.
 *
 * Detalle importante: useRouter() SOLO funciona dentro de un componente. Aqui,
 * que es un archivo suelto, se importa la instancia del router directamente
 * (por eso /router/index.js hace "export const router").
 */
function cerrarSesionYSalir() {
  const auth = useAuthStore();
  auth.cerrarSesion();

  // Si ya esta en el login, no tiene sentido volver a navegar.
  if (router.currentRoute.value.name !== "login") {
    router.push({ name: "login" });
  }
}

/**
 * Traduce los fallos que NO traen respuesta del servidor.
 * @param {Object} error - error crudo de axios
 * @returns {string} mensaje entendible para el usuario
 */
function mensajeSegunFallo(error) {
  if (error.code === "ECONNABORTED") {
    return "El servidor tardo demasiado en responder";
  }
  if (!error.response) {
    return "No hay conexion con el servidor. ¿Esta corriendo el backend? ¿Tiene CORS habilitado?";
  }
  return "Ocurrio un error inesperado";
}

export default api;
