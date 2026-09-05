/**
 * @fileoverview /utils/formatDate.js
 * Formateo de fechas. El backend (timestamps de Mongoose) devuelve fechas ISO
 * ("2026-08-12T14:30:00.000Z"), que no se le muestran nunca al usuario tal cual.
 */

/**
 * Convierte una fecha ISO en formato dd/mm/aaaa.
 * @param {string|Date} fecha - fecha ISO o instancia de Date
 * @returns {string} fecha formateada, o "-" si el valor es invalido
 */
export function formatDate(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Igual que formatDate pero incluyendo la hora.
 * @param {string|Date} fecha
 * @returns {string}
 */
export function formatDateTime(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
