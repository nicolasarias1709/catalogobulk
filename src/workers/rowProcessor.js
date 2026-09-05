// src/workers/rowProcessor.js
// Aplica, en orden, las reglas de validación (6.3) y normalización (6.4)
// a UNA fila cruda del archivo. No sabe nada de Mongo ni del ImportJob:
// solo recibe un objeto y devuelve si es válida (y ya normalizada) o no
// (y por qué). Esto lo hace fácil de probar de forma aislada.

const URL_RE = /^https?:\/\/.+/;

// Devuelve una de dos formas:
//  - { valido: true, fila: {...normalizada}, advertencia: string|null }
//  - { valido: false, motivo: string }
function validarYNormalizarFila(filaCruda) {
  const sku = (filaCruda.sku ?? '').toString().trim();
  const nombre = (filaCruda.nombre ?? '').toString().trim();
  const categoria = (filaCruda.categoria ?? '').toString().trim();

  if (!sku) return { valido: false, motivo: 'sku vacío' };
  if (!nombre) return { valido: false, motivo: 'nombre vacío' };
  if (!categoria) return { valido: false, motivo: 'categoria vacía' };

  const precio = typeof filaCruda.precio === 'number' ? filaCruda.precio : parseFloat(filaCruda.precio);
  if (Number.isNaN(precio) || precio < 0) {
    return { valido: false, motivo: 'precio inválido' };
  }

  const stock = typeof filaCruda.stock === 'number' ? filaCruda.stock : parseInt(filaCruda.stock, 10);
  if (Number.isNaN(stock) || stock < 0) {
    return { valido: false, motivo: 'stock inválido' };
  }

  // imagenUrl inválida es ADVERTENCIA, no motivo de rechazo (sección 6.3):
  // la fila sigue siendo válida, solo se guarda sin imagen.
  let imagenUrl = null;
  let advertencia = null;
  const imagenUrlTrim = (filaCruda.imagenUrl ?? '').toString().trim();
  if (imagenUrlTrim) {
    if (URL_RE.test(imagenUrlTrim)) {
      imagenUrl = imagenUrlTrim;
    } else {
      advertencia = 'imagenUrl inválida, ignorada';
    }
  }

  const descripcionTrim = (filaCruda.descripcion ?? '').toString().trim();

  const filaNormalizada = {
    sku: sku.toUpperCase(),
    nombre: nombre.replace(/\s+/g, ' '), // colapsa espacios internos multiples
    precio: Math.round(precio * 100) / 100, // redondeo a 2 decimales
    stock: Math.trunc(stock),
    categoria: categoria.toLowerCase(),
    descripcion: descripcionTrim || null,
    imagenUrl,
  };

  return { valido: true, fila: filaNormalizada, advertencia };
}

module.exports = { validarYNormalizarFila };
