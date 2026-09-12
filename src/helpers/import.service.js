// src/helpers/import.service.js
// Fase 2: este servicio SOLO recibe el archivo, valida lo mínimo (proveedor
// existe y activo, extensión correcta) y encola. El procesamiento real del
// contenido del archivo (validar filas, normalizar, persistir productos)
// vive en el worker — Fase 3, todavía no implementada.
//
// Esto es a propósito: POST /api/imports debe responder en milisegundos,
// no puede quedarse leyendo un CSV de 120.000 filas dentro de la petición.

const path = require('path');
const importRepo = require('../repositories/import.repository');
const proveedorRepo = require('../repositories/proveedor.repository');
const AppError = require('../errors/AppError');
const { importQueue } = require('../queues/import.queue');

const EXTENSIONES_VALIDAS = ['.csv', '.json'];
const TIPOS_VALIDOS = ['productos', 'proveedores', 'categorias'];

async function crearImport({ usuarioId, tipo, proveedorId, archivo }) {
  if (!archivo) {
    throw new AppError(400, 'Debes adjuntar un archivo en el campo "archivo"', 'ARCHIVO_REQUERIDO');
  }

  // "productos" sigue siendo el valor por defecto: así el contrato para
  // quien ya integraba este endpoint (sin mandar "tipo") no cambia.
  const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'productos';

  const ext = path.extname(archivo.originalname).toLowerCase();
  if (!EXTENSIONES_VALIDAS.includes(ext)) {
    throw new AppError(400, 'Extensión de archivo inválida. Solo .csv o .json', 'EXTENSION_INVALIDA');
  }

  // Solo un import de PRODUCTOS pertenece a un proveedor. Un catálogo de
  // proveedores o de categorías no depende de ninguno.
  if (tipoFinal === 'productos') {
    if (!proveedorId) {
      throw new AppError(400, 'proveedorId es requerido', 'VALIDACION');
    }

    const proveedor = await proveedorRepo.buscarPorId(proveedorId);
    if (!proveedor) {
      throw new AppError(404, 'proveedorId no existe', 'PROVEEDOR_NO_ENCONTRADO');
    }
    if (!proveedor.activo) {
      throw new AppError(409, 'El proveedor está inactivo, no puede recibir importaciones', 'PROVEEDOR_INACTIVO');
    }
  }

  // Se crea en 'pending'. El worker es quien lo pasa a 'processing'.
  const job = await importRepo.crear({
    usuarioId,
    tipo: tipoFinal,
    proveedorId: tipoFinal === 'productos' ? proveedorId : null,
    archivoNombre: archivo.originalname,
    archivoRuta: archivo.path,
    estado: 'pending',
  });

  // Encolar: esto es lo único "pesado" de esta petición, y BullMQ responde rápido.
  const bullJob = await importQueue.add('procesar-import', {
    importJobId: job._id.toString(),
  });

  job.bullJobId = bullJob.id;
  await job.save();

  return { importJobId: job._id.toString(), estado: job.estado, tipo: job.tipo };
}

async function obtenerImport(id, usuario) {
  const job = await importRepo.buscarPorId(id);
  if (!job) {
    throw new AppError(404, 'ImportJob no encontrado', 'NO_ENCONTRADO');
  }

  // Solo el dueño del import o un admin puede consultarlo.
  if (usuario.rol !== 'admin' && job.usuarioId.toString() !== usuario.id) {
    throw new AppError(403, 'No tienes permiso para ver este import', 'PROHIBIDO');
  }

  const porcentaje = job.total ? Math.round((job.procesados / job.total) * 100) : 0;

  return {
    importJobId: job._id.toString(),
    tipo: job.tipo,
    proveedorId: job.proveedorId,
    archivoNombre: job.archivoNombre,
    estado: job.estado,
    total: job.total,
    procesados: job.procesados,
    exitosos: job.exitosos,
    fallidos: job.fallidos,
    porcentaje,
    errores: job.errores,
    motivoFallo: job.motivoFallo,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
  };
}

async function listarImports({ page = 1, limit = 20, tipo }) {
  const limitFinal = Math.min(parseInt(limit, 10) || 20, 100);
  const pageFinal = Math.max(parseInt(page, 10) || 1, 1);

  const filtro = {};
  if (TIPOS_VALIDOS.includes(tipo)) filtro.tipo = tipo;

  const [data, total] = await importRepo.listar({ page: pageFinal, limit: limitFinal, filtro });
  return { data, page: pageFinal, limit: limitFinal, total };
}

/** Escapa un valor para una celda CSV (comillas dobles si trae coma, comilla o salto de línea). */
function escaparCeldaCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Arma el contenido de texto del reporte CSV a partir de job.resultados. */
function construirReporteCsv(job) {
  const encabezado = ['fila', 'identificador', 'estado', 'motivo'];
  const lineas = [encabezado.join(',')];

  (job.resultados || []).forEach((r) => {
    lineas.push(
      [r.fila, r.identificador, r.estado === 'ok' ? 'éxito' : 'error', r.motivo || '']
        .map(escaparCeldaCsv)
        .join(',')
    );
  });

  return lineas.join('\r\n');
}

/**
 * Genera el reporte CSV de un import ya terminado: una fila por cada renglón
 * del archivo original, con si se importó bien o por qué falló. Es la forma
 * en la que el panel de admin "arroja" el resultado de cada importación a
 * un archivo, en vez de solo mostrar contadores en pantalla.
 */
async function generarReporteCsv(id, usuario) {
  const job = await importRepo.buscarPorId(id);
  if (!job) {
    throw new AppError(404, 'ImportJob no encontrado', 'NO_ENCONTRADO');
  }

  if (usuario.rol !== 'admin' && job.usuarioId.toString() !== usuario.id) {
    throw new AppError(403, 'No tienes permiso para ver este import', 'PROHIBIDO');
  }

  if (job.estado === 'pending' || job.estado === 'processing') {
    throw new AppError(409, 'El import todavía se está procesando, intenta de nuevo en un momento', 'IMPORT_EN_PROCESO');
  }

  return {
    nombreArchivo: `reporte-import-${job._id}.csv`,
    contenido: construirReporteCsv(job),
  };
}

module.exports = { crearImport, obtenerImport, listarImports, generarReporteCsv };
