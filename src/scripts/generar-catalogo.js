// src/scripts/generar-catalogo.js
// Genera un CSV de prueba con filas intencionalmente sucias (campos
// vacíos, precios malformados, duplicados, mayúsculas inconsistentes) —
// para poder probar el worker con un volumen realista (sección 4 pide
// >= 120.000 filas).
//
// Uso: node src/scripts/generar-catalogo.js [numFilas] [rutaSalida]

const fs = require('fs');
const path = require('path');

const NUM_FILAS = Number(process.argv[2]) || 120000;
const SALIDA = process.argv[3] || path.join(process.cwd(), 'data', 'catalogo-prueba.csv');

const CATEGORIAS = ['ropa', 'Ropa', 'HOGAR', 'hogar', 'electronica', 'Electronica', 'juguetes', 'deportes'];
const NOMBRES = ['Camiseta', 'Taza', 'Audifonos', 'Mochila', 'Lampara', 'Silla', 'Balon', 'Reloj'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarFila(i) {
  const sku = `SKU-${String(i).padStart(6, '0')}`;
  const nombre = `${NOMBRES[randInt(0, NOMBRES.length - 1)]}  ${randInt(1, 999)}`; // doble espacio a propósito
  const categoria = CATEGORIAS[randInt(0, CATEGORIAS.length - 1)];
  const roll = Math.random();

  if (roll < 0.02) return `${sku},,${randInt(1, 200)}.99,${randInt(0, 100)},${categoria},,`; // nombre vacío
  if (roll < 0.04) return `${sku},${nombre},no-es-un-precio,${randInt(0, 100)},${categoria},,`; // precio malo
  if (roll < 0.06 && i > 10) {
    const skuDup = `SKU-${String(randInt(1, i - 1)).padStart(6, '0')}`;
    return `${skuDup},${nombre},${randInt(1, 200)}.99,${randInt(0, 100)},${categoria},,`; // sku duplicado
  }
  if (roll < 0.09) {
    return `${sku},${nombre},${(randInt(1, 200) + Math.random()).toFixed(3)},${randInt(0, 100)},${categoria},Desc,no-es-una-url`; // imagenUrl mala (advertencia)
  }

  const precio = (randInt(1, 200) + Math.random()).toFixed(3); // 3 decimales a propósito
  const imagenUrl = `https://cdn.demo.com/img/${sku.toLowerCase()}.jpg`;
  return `${sku},${nombre},${precio},${randInt(0, 200)},${categoria},Descripcion de ${nombre},${imagenUrl}`;
}

function main() {
  const dir = path.dirname(SALIDA);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stream = fs.createWriteStream(SALIDA);
  stream.write('sku,nombre,precio,stock,categoria,descripcion,imagenUrl\n');
  for (let i = 1; i <= NUM_FILAS; i += 1) stream.write(`${generarFila(i)}\n`);
  stream.end(() => console.log(`[generar-catalogo] ${NUM_FILAS} filas escritas en ${SALIDA}`));
}

main();
