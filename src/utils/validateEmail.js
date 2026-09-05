/**
 * @fileoverview /utils/validateEmail.js
 * Funcion pura: recibe un valor y devuelve un booleano. No sabe nada de Vue,
 * ni de Quasar, ni del backend. Por eso vive en /utils y no en /composables.
 */

// Patron suficiente para un formulario: algo@algo.algo sin espacios.
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida el formato de un correo electronico.
 * @param {string} valor - texto a validar
 * @returns {boolean} true si el formato es valido
 */
export function validateEmail(valor) {
  return PATRON_EMAIL.test(String(valor ?? "").trim());
}
