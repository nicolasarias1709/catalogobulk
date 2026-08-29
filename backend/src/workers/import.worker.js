// src/workers/import.worker.js
// Se ejecuta como proceso APARTE: `npm run worker` (node
// src/workers/import.worker.js). Nunca corre dentro del proceso del API
// (server.js) — así procesar un archivo de 120.000 filas nunca bloquea
// una petición HTTP. Es el consumidor de la cola "imports" que
// import.queue.js define y que POST /api/imports alimenta (Fase 2).

const { Worker } = require('bullmq');
const env = require('../config/env'); // valida .env también en el worker
const { conectarMongo } = require('../config/db');
const { redis } = require('../config/redis');

const ImportJob = require('../models/importJob.model');
const Producto = require('../models/producto.model');
const categoriaRepo = require('../repositories/categoria.repository');
const { invalidarCacheProductos } = require('../config/cache');

const { leerArchivoCatalogo } = require('./fileReader');
const { validarYNormalizarFila } = require('./rowProcessor');

function agregarError(errores, fila, sku, motivo) {
  // Cap de errores individuales guardados por job (sección 3: IMPORT_ERRORS_CAP),
  // para no reventar el documento de Mongo con archivos muy sucios.
  if (errores.length < env.IMPORT_ERRORS_CAP) {
    errores.push({ fila, sku: sku || null, motivo });
  }
}

async function insertarLote(lote, contadores, errores) {
  if (lote.length === 0) return;

  // ordered:false -> si un doc del lote falla (ej: sku duplicado contra la
  // base), Mongo sigue insertando el resto en vez de abortar el lote entero.
  try {
    const insertados = await Producto.insertMany(lote, { ordered: false });
    contadores.exitosos += insertados.length;
  } catch (err) {
    const insertadosOk = err.insertedDocs ? err.insertedDocs.length : 0;
    contadores.exitosos += insertadosOk;
    contadores.fallidos += lote.length - insertadosOk;

    const writeErrors = err.writeErrors || [];
    writeErrors.forEach((we) => {
      const doc = lote[we.index];
      agregarError(errores, doc.__fila, doc.sku, 'sku duplicado');
    });
  }
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

  // --- Leer el archivo completo. Si esto falla, es un fallo irrecuperable ---
  let filas;
  try {
    filas = leerArchivoCatalogo(job.archivoRuta);
  } catch (err) {
    job.estado = 'failed';
    job.motivoFallo = err.message;
    job.finishedAt = new Date();
    await job.save();
    throw err; // BullMQ lo marca como failed también, queda trazado en la cola
  }

  job.total = filas.length;
  await job.save();

  const errores = [];
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
    } else {
      const { fila } = resultado;

      // sku duplicado DENTRO del mismo archivo (distinto del duplicado
      // contra la base, que se detecta en el insertMany de abajo)
      if (skusVistosEnArchivo.has(fila.sku)) {
        contadores.fallidos += 1;
        agregarError(errores, numeroFila, fila.sku, 'sku duplicado');
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
      await insertarLote(lote, contadores, errores);
      lote = [];
    }

    // Reporta progreso cada BATCH_SIZE filas (o al terminar), no en cada fila,
    // para no saturar Mongo/Redis con updates constantes.
    if (procesados % env.BATCH_SIZE === 0 || procesados === filas.length) {
      job.procesados = procesados;
      job.exitosos = contadores.exitosos;
      job.fallidos = contadores.fallidos;
      job.errores = errores;
      await job.save();

      const porcentaje = job.total ? Math.round((procesados / job.total) * 100) : 0;
      await bullJob.updateProgress(porcentaje); // esto es lo que la Fase 4 retransmite por socket
    }
  }

  await insertarLote(lote, contadores, errores); // ultimo lote incompleto

  // Efecto secundario del import (sección 6.5): crear las categorías nuevas.
  await Promise.all([...categoriasVistas].map((slug) => categoriaRepo.upsertPorSlug(slug)));

  job.procesados = procesados;
  job.exitosos = contadores.exitosos;
  job.fallidos = contadores.fallidos;
  job.errores = errores;
  job.estado = 'completed'; // aunque haya fallidos > 0: filas malas no es un fallo del job
  job.finishedAt = new Date();
  await job.save();

  // Los datos que expone GET /api/productos y /stats acaban de cambiar.
  await invalidarCacheProductos();
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
