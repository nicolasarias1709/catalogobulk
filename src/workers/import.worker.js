// src/workers/import.worker.js
// Se ejecuta como proceso APARTE: `npm run worker` (node
// src/workers/import.worker.js). Nunca corre dentro del proceso del API
// (server.js) — así procesar un archivo grande nunca bloquea una petición
// HTTP. Es el consumidor de la cola "imports" que import.queue.js define y
// que POST /api/imports alimenta.
//
// Soporta TRES tipos de import (job.tipo, ver models/importJob.model.js):
//   - "productos":   el original. Batch insert con insertMany, pensado para
//                     archivos grandes (hasta 120.000 filas).
//   - "proveedores": nuevo. Un CSV/JSON de proveedores.
//   - "categorias":  nuevo. Un CSV/JSON de categorías.
// Los dos nuevos son mucho más simples a propósito: los archivos que sube un
// admin desde el panel son de decenas o cientos de filas (no cientos de
// miles), así que en vez de reimplementar inserción por lotes se reutilizan
// los MISMOS services que usa el formulario manual del panel
// (helpers/proveedor.service.js y helpers/categoria.service.js): así las
// reglas de validación y de duplicados son EXACTAMENTE las mismas sin
// duplicar código.

const { Worker } = require('bullmq');
const env = require('../config/env'); // valida .env también en el worker
const { conectarMongo } = require('../config/db');
const { redis } = require('../config/redis');

const ImportJob = require('../models/importJob.model');
const Producto = require('../models/producto.model');
const categoriaRepo = require('../repositories/categoria.repository');
const categoriaService = require('../helpers/categoria.service');
const proveedorService = require('../helpers/proveedor.service');
const { invalidarCacheProductos } = require('../config/cache');
const { generarSlug } = require('../utils/slug');

const { leerArchivoCatalogo, leerArchivoGenerico } = require('./fileReader');
const { validarYNormalizarFila } = require('./rowProcessor');

function agregarError(errores, fila, sku, motivo) {
  // Cap de errores individuales guardados por job (sección 3: IMPORT_ERRORS_CAP),
  // para no reventar el documento de Mongo con archivos muy sucios.
  if (errores.length < env.IMPORT_ERRORS_CAP) {
    errores.push({ fila, sku: sku || null, motivo });
  }
}

/** Igual que agregarError, pero para el arreglo "resultados" (el que arma el reporte .csv). */
function agregarResultado(resultados, fila, identificador, estado, motivo = null) {
  if (resultados.length < env.IMPORT_ERRORS_CAP) {
    resultados.push({ fila, identificador: identificador || null, estado, motivo });
  }
}

async function insertarLote(lote, contadores, errores, resultados) {
  if (lote.length === 0) return;

  // ordered:false -> si un doc del lote falla (ej: sku duplicado contra la
  // base), Mongo sigue insertando el resto en vez de abortar el lote entero.
  try {
    const insertados = await Producto.insertMany(lote, { ordered: false });
    contadores.exitosos += insertados.length;
    // Se recorre "lote" (el array original, en memoria) y no "insertados"
    // (los documentos que devuelve Mongo): __fila no está en el schema, así
    // que Mongoose lo descarta al crear el documento devuelto.
    lote.forEach((doc) => agregarResultado(resultados, doc.__fila, doc.sku, 'ok'));
  } catch (err) {
    const insertadosOk = err.insertedDocs ? err.insertedDocs.length : 0;
    contadores.exitosos += insertadosOk;
    contadores.fallidos += lote.length - insertadosOk;

    const idsFallidos = new Set((err.writeErrors || []).map((we) => we.index));
    lote.forEach((doc, index) => {
      if (idsFallidos.has(index)) {
        agregarError(errores, doc.__fila, doc.sku, 'sku duplicado');
        agregarResultado(resultados, doc.__fila, doc.sku, 'error', 'sku duplicado');
      } else {
        agregarResultado(resultados, doc.__fila, doc.sku, 'ok');
      }
    });
  }
}

/** Import de PRODUCTOS: sin cambios de fondo respecto a la versión original. */
async function procesarProductos(job, bullJob) {
  const filas = leerArchivoCatalogo(job.archivoRuta);

  job.total = filas.length;
  await job.save();

  const errores = [];
  const resultados = [];
  const contadores = { exitosos: 0, fallidos: 0 };
  const skusVistosEnArchivo = new Set();
  const categoriasVistas = new Set();
  let lote = [];
  let procesados = 0;

  for (let i = 0; i < filas.length; i += 1) {
    const numeroFila = i + 2; // fila 1 es el header
    const resultado = validarYNormalizarFila(filas[i]);
    procesados += 1;

    if (!resultado.valido) {
      contadores.fallidos += 1;
      agregarError(errores, numeroFila, filas[i].sku || null, resultado.motivo);
      agregarResultado(resultados, numeroFila, filas[i].sku || null, 'error', resultado.motivo);
    } else {
      const { fila } = resultado;

      // sku duplicado DENTRO del mismo archivo (distinto del duplicado
      // contra la base, que se detecta en el insertMany de abajo)
      if (skusVistosEnArchivo.has(fila.sku)) {
        contadores.fallidos += 1;
        agregarError(errores, numeroFila, fila.sku, 'sku duplicado');
        agregarResultado(resultados, numeroFila, fila.sku, 'error', 'sku duplicado');
      } else {
        skusVistosEnArchivo.add(fila.sku);
        categoriasVistas.add(fila.categoria);

        if (resultado.advertencia) {
          agregarError(errores, numeroFila, fila.sku, resultado.advertencia);
        }

        lote.push({
          ...fila,
          proveedorId: job.proveedorId,
          __fila: numeroFila, // solo vive en memoria, para poder mapear errores del bulk write
        });
      }
    }

    if (lote.length >= env.BATCH_SIZE) {
      await insertarLote(lote, contadores, errores, resultados);
      lote = [];
    }

    // Reporta progreso cada BATCH_SIZE filas (o al terminar), no en cada fila,
    // para no saturar Mongo/Redis con updates constantes.
    if (procesados % env.BATCH_SIZE === 0 || procesados === filas.length) {
      job.procesados = procesados;
      job.exitosos = contadores.exitosos;
      job.fallidos = contadores.fallidos;
      job.errores = errores;
      job.resultados = resultados;
      await job.save();

      const porcentaje = job.total ? Math.round((procesados / job.total) * 100) : 0;
      await bullJob.updateProgress(porcentaje); // esto es lo que la Fase 4 retransmite por socket
    }
  }

  await insertarLote(lote, contadores, errores, resultados); // ultimo lote incompleto

  // Efecto secundario del import: crear las categorías nuevas que hagan falta.
  await Promise.all([...categoriasVistas].map((slug) => categoriaRepo.upsertPorSlug(slug)));

  job.procesados = procesados;
  job.exitosos = contadores.exitosos;
  job.fallidos = contadores.fallidos;
  job.errores = errores;
  job.resultados = resultados;
  job.estado = 'completed'; // aunque haya fallidos > 0: filas malas no es un fallo del job
  job.finishedAt = new Date();
  await job.save();

  // Los datos que expone GET /api/productos y /stats acaban de cambiar.
  await invalidarCacheProductos();
}

/**
 * Import de PROVEEDORES: una fila por proveedor. Reutiliza
 * proveedorService.crearProveedor, así que las reglas de nombre/slug
 * duplicado, formato de email y de logoUrl son las MISMAS que en el
 * formulario manual de ProveedoresView.
 *
 * Columnas esperadas: nombre (obligatoria), slug (opcional, se genera del
 * nombre si falta), contactoEmail (opcional), logoUrl (opcional).
 */
async function procesarProveedores(job) {
  const filas = leerArchivoGenerico(job.archivoRuta);

  job.total = filas.length;
  await job.save();

  const errores = [];
  const resultados = [];
  const contadores = { exitosos: 0, fallidos: 0 };

  for (let i = 0; i < filas.length; i += 1) {
    const numeroFila = i + 2;
    const filaCruda = filas[i];
    const nombre = (filaCruda.nombre ?? '').toString().trim();

    if (!nombre) {
      contadores.fallidos += 1;
      agregarError(errores, numeroFila, null, 'nombre vacío');
      agregarResultado(resultados, numeroFila, null, 'error', 'nombre vacío');
    } else {
      const slugCrudo = (filaCruda.slug ?? '').toString().trim().toLowerCase();
      const slug = slugCrudo || generarSlug(nombre);
      const contactoEmail = (filaCruda.contactoEmail ?? '').toString().trim() || null;
      const logoUrl = (filaCruda.logoUrl ?? '').toString().trim() || null;

      try {
        await proveedorService.crearProveedor({ nombre, slug, contactoEmail, logoUrl });
        contadores.exitosos += 1;
        agregarResultado(resultados, numeroFila, nombre, 'ok');
      } catch (err) {
        contadores.fallidos += 1;
        const motivo = err.message || 'error desconocido';
        agregarError(errores, numeroFila, nombre, motivo);
        agregarResultado(resultados, numeroFila, nombre, 'error', motivo);
      }
    }

    job.procesados = i + 1;
    job.exitosos = contadores.exitosos;
    job.fallidos = contadores.fallidos;
    job.errores = errores;
    job.resultados = resultados;
    // Se guarda cada fila: los archivos de proveedores son de pocas decenas
    // de filas (no miles), así que el costo extra en Mongo es despreciable
    // y a cambio el progreso se ve fila a fila en el panel.
    await job.save();
  }

  job.estado = 'completed';
  job.finishedAt = new Date();
  await job.save();
}

/**
 * Import de CATEGORÍAS: una fila por categoría. Reutiliza
 * categoriaService.crearCategoria, que genera el slug solo a partir del
 * nombre y revisa duplicados — igual que crear una categoría a mano desde
 * el panel.
 *
 * Columnas esperadas: nombre (obligatoria), descripcion (opcional),
 * imagenUrl (opcional).
 */
async function procesarCategorias(job) {
  const filas = leerArchivoGenerico(job.archivoRuta);

  job.total = filas.length;
  await job.save();

  const errores = [];
  const resultados = [];
  const contadores = { exitosos: 0, fallidos: 0 };

  for (let i = 0; i < filas.length; i += 1) {
    const numeroFila = i + 2;
    const filaCruda = filas[i];
    const nombre = (filaCruda.nombre ?? '').toString().trim();

    if (!nombre) {
      contadores.fallidos += 1;
      agregarError(errores, numeroFila, null, 'nombre vacío');
      agregarResultado(resultados, numeroFila, null, 'error', 'nombre vacío');
    } else {
      const slugCrudo = (filaCruda.slug ?? '').toString().trim().toLowerCase();
      const slug = slugCrudo || generarSlug(nombre);
      const descripcion = (filaCruda.descripcion ?? '').toString().trim() || null;
      const imagenUrl = (filaCruda.imagenUrl ?? '').toString().trim() || null;

      try {
        await categoriaService.crearCategoria({ nombre, slug, descripcion, imagenUrl });
        contadores.exitosos += 1;
        agregarResultado(resultados, numeroFila, nombre, 'ok');
      } catch (err) {
        contadores.fallidos += 1;
        const motivo = err.message || 'error desconocido';
        agregarError(errores, numeroFila, nombre, motivo);
        agregarResultado(resultados, numeroFila, nombre, 'error', motivo);
      }
    }

    job.procesados = i + 1;
    job.exitosos = contadores.exitosos;
    job.fallidos = contadores.fallidos;
    job.errores = errores;
    job.resultados = resultados;
    await job.save();
  }

  job.estado = 'completed';
  job.finishedAt = new Date();
  await job.save();
}

async function procesarImportJob(bullJob) {
  const { importJobId } = bullJob.data;
  const job = await ImportJob.findById(importJobId);
  if (!job) {
    throw new Error(`ImportJob ${importJobId} no encontrado`);
  }

  job.estado = 'processing';
  job.startedAt = new Date();
  await job.save();

  try {
    if (job.tipo === 'proveedores') {
      await procesarProveedores(job);
    } else if (job.tipo === 'categorias') {
      await procesarCategorias(job);
    } else {
      await procesarProductos(job, bullJob);
    }
  } catch (err) {
    // Fallo irrecuperable (archivo corrupto, header inválido, etc.), igual
    // para los tres tipos: se marca el job como failed y se re-lanza para
    // que BullMQ también lo trace como failed en la cola.
    job.estado = 'failed';
    job.motivoFallo = err.message;
    job.finishedAt = new Date();
    await job.save();
    throw err;
  }
}

async function main() {
  await conectarMongo();

  const worker = new Worker(
    'imports',
    async (bullJob) => procesarImportJob(bullJob),
    { connection: redis, concurrency: 2 }
  );

  worker.on('completed', (bullJob) => {
    console.log(`[import.worker] job ${bullJob.id} completado`);
  });

  worker.on('failed', (bullJob, err) => {
    console.error(`[import.worker] job ${bullJob?.id} falló: ${err.message}`);
  });

  // SIN ESTO, EL WORKER SE CAE apenas Redis falle (mismo motivo que en
  // queues/import.queue.js y sockets/index.js: un 'error' de BullMQ sin
  // '.on(error)' tumba el proceso completo).
  worker.on('error', (err) => {
    console.warn(`[import.worker] problema de conexión con Redis: ${err.message}`);
  });

  console.log('[import.worker] escuchando la cola "imports"');
}

main().catch((err) => {
  console.error('[import.worker] error fatal al arrancar:', err);
  process.exit(1);
});
