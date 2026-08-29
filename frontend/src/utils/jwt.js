/**
 * @fileoverview /utils/jwt.js
 * Funcion pura para leer el PAYLOAD de un JWT en el navegador, sin verificar
 * la firma (esa verificacion la hace siempre el backend).
 *
 * ¿Por que existe este archivo? El backend de referencia ("backend prueba")
 * responde el login con { usuario, token }: el usuario ya viene completo.
 *
 * El backend de CatalogoBulk (src/helpers/auth.service.js -> login) responde
 * SOLO { token }, sin objeto usuario, y no expone ningun endpoint tipo
 * GET /auth/me para consultarlo despues. Como el JWT si lleva { sub, rol }
 * en su payload (ver helpers/auth.service.js: jwt.sign({ sub, rol }, ...)),
 * la forma mas simple de mostrar el rol en la interfaz sin tocar el backend
 * es leerlo directamente del token ya en el navegador.
 */

/**
 * Decodifica la parte central (payload) de un JWT.
 * NO valida la firma ni la expiracion: eso es responsabilidad exclusiva del
 * backend en cada peticion. Aqui solo se usa para pintar datos en pantalla.
 *
 * @param {string} token - JWT completo (header.payload.firma)
 * @returns {{sub?: string, rol?: string, exp?: number}|null}
 */
export function decodificarPayloadJWT(token) {
  try {
    const partePayload = token.split(".")[1];
    // atob decodifica base64; el JWT usa base64url, por eso se reemplazan
    // los caracteres que no coinciden con base64 estandar.
    const base64 = partePayload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
