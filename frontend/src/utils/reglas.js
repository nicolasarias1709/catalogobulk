/**
 * @fileoverview /utils/reglas.js
 * REGLAS DE VALIDACION PARA LOS FORMULARIOS (prop :rules de Quasar).
 *
 * Como funcionan las rules de Quasar:
 *   - Se pasan como un ARRAY de funciones a <q-input :rules="[...]">.
 *   - Cada funcion recibe el valor del campo y debe devolver:
 *       true            -> el campo es valido
 *       "texto"         -> el campo es invalido y ese texto se pinta en rojo
 *   - Al hacer <q-form @submit="..."> Quasar ejecuta TODAS las reglas y solo
 *     dispara el submit si todas pasan.
 *
 * IMPORTANTE: estas validaciones son de EXPERIENCIA DE USUARIO (respuesta
 * inmediata, sin ir al servidor). NO reemplazan las del backend: el servidor
 * siempre vuelve a validar (ver los *.model.js del backend), porque el
 * navegador se puede manipular.
 */
import { validateEmail } from "./validateEmail";

/**
 * El campo no puede ir vacio.
 * @param {string} campo - nombre visible del campo, usado en el mensaje
 * @returns {(v: any) => true|string} regla lista para :rules
 */
export const requerido =
  (campo = "Este campo") =>
  (v) =>
    (v !== null && v !== undefined && String(v).trim() !== "") ||
    `${campo} es obligatorio`;

/**
 * Formato de correo valido.
 * @returns {(v: string) => true|string}
 */
export const esEmail =
  () =>
  (v) =>
    validateEmail(v) || "El email no es valido";

/**
 * Formato de correo valido, pero SOLO si el campo trae algo (campo opcional).
 * Espeja contactoEmail del backend (default: null, no requerido).
 * @returns {(v: string) => true|string}
 */
export const esEmailOpcional =
  () =>
  (v) =>
    !v || validateEmail(v) || "El email no es valido";

/**
 * Longitud minima de texto.
 * @param {number} min - cantidad minima de caracteres
 * @param {string} campo
 * @returns {(v: string) => true|string}
 */
export const minimo =
  (min, campo = "Este campo") =>
  (v) =>
    String(v ?? "").trim().length >= min ||
    `${campo} debe tener al menos ${min} caracteres`;

/**
 * Longitud maxima de texto.
 * @param {number} max
 * @param {string} campo
 * @returns {(v: string) => true|string}
 */
export const maximo =
  (max, campo = "Este campo") =>
  (v) =>
    String(v ?? "").trim().length <= max ||
    `${campo} no puede superar los ${max} caracteres`;

/**
 * Numero mayor o igual a un minimo (admite decimales). Espeja "min: 0" de
 * precio/stock en producto.model.js del backend.
 * @param {number} min
 * @param {string} campo
 * @returns {(v: any) => true|string}
 */
export const numeroMinimo =
  (min, campo = "El valor") =>
  (v) => {
    const n = Number(v);
    return (Number.isFinite(n) && n >= min) || `${campo} debe ser mayor o igual a ${min}`;
  };

/**
 * Obliga a que el valor sea un entero. Espeja el validator de "stock" en
 * producto.model.js (Number.isInteger).
 * @param {string} campo
 * @returns {(v: any) => true|string}
 */
export const entero =
  (campo = "El valor") =>
  (v) =>
    Number.isInteger(Number(v)) || `${campo} debe ser un numero entero`;

/**
 * Obliga a elegir una opcion en un q-select.
 * @param {string} campo
 * @returns {(v: any) => true|string}
 */
export const seleccionRequerida =
  (campo = "Este campo") =>
  (v) =>
    (v !== null && v !== undefined && v !== "") || `Debe seleccionar ${campo}`;

/**
 * URL http(s) valida, pero SOLO si el campo trae algo (campo opcional).
 * Espeja el validator de imagenUrl/logoUrl del backend: /^https?:\/\/.+/
 * @param {string} campo
 * @returns {(v: string) => true|string}
 */
export const urlOpcional =
  (campo = "La URL") =>
  (v) =>
    !v || /^https?:\/\/.+/.test(String(v).trim()) || `${campo} debe empezar por http:// o https://`;

/**
 * Coincide con un patron regex. Se usa para el slug de proveedor
 * (^[a-z0-9-]+$, igual que proveedor.model.js del backend).
 * @param {RegExp} regex
 * @param {string} mensaje
 * @returns {(v: string) => true|string}
 */
export const patron =
  (regex, mensaje) =>
  (v) =>
    regex.test(String(v ?? "").trim()) || mensaje;
