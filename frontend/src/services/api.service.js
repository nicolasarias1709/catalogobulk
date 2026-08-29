/**
 * @fileoverview /services/api.service.js
 * Las 4 funciones con las que se consume CUALQUIER API: get, post, put y delete.
 *
 * Cada una es una funcion suelta (no un objeto con metodos) para que en la vista
 * se lean cortas y directas:
 *
 *   import { get, post, put } from "@/services/api.service";
 *
 *   const productos = await get("/productos");
 *   await post("/auth/login", { email, password });
 *   await put(`/productos/${id}`, datos);
 *
 * Dos detalles importantes:
 *
 * 1. Devuelven directamente el "data" de la respuesta. Axios entrega un objeto
 *    grande ({ data, status, headers... }) del que casi siempre solo interesa
 *    "data"; desempacarlo aqui evita escribir "const { data } = ..." en cada vista.
 *
 * 2. NO llevan try/catch. Si el servidor falla, el error sube hasta quien llamo
 *    a la funcion, que es la vista, y ahi se decide que mensaje mostrar. El
 *    error ya viene ordenado como { status, mensaje, codigo } gracias al
 *    interceptor de /plugins/axios.js.
 */
import api from "@/plugins/axios";

/**
 * LEER datos.
 * @param {string} url - ruta relativa al backend. Ej: "/productos"
 * @returns {Promise<any>} lo que respondio el backend
 */
export const get = async (url) => {
  const { data } = await api.get(url);
  return data;
};

/**
 * CREAR un registro.
 * @param {string} url - Ej: "/auth/login"
 * @param {Object} datos - cuerpo que se envia en formato JSON
 * @returns {Promise<any>}
 */
export const post = async (url, datos) => {
  const { data } = await api.post(url, datos);
  return data;
};

/**
 * ACTUALIZAR un registro.
 * @param {string} url - Ej: "/productos/123"
 * @param {Object} [datos]
 * @returns {Promise<any>}
 */
export const put = async (url, datos = {}) => {
  const { data } = await api.put(url, datos);
  return data;
};

/**
 * BORRAR un registro.
 * Se llama "del" y no "delete" porque delete es una palabra reservada de
 * JavaScript y no se puede usar como nombre de variable.
 * @param {string} url - Ej: "/productos/123"
 * @returns {Promise<any>}
 */
export const del = async (url) => {
  const { data } = await api.delete(url);
  return data;
};
