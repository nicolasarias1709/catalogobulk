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

async function crearImport({ usuarioId, proveedorId, archivo }) {
  if (!archivo) {
    throw new AppError(400, 'Debes adjuntar un archivo en el campo "archivo"', 'ARCHIVO_REQUERIDO');
  }
  if (!proveedorId) {
    throw new AppError(400, 'proveedorId es requerido', 'VALIDACION');
  }

  const ext = path.extname(archivo.originalname).toLowerCase();
  if (!EXTENSIONES_VALIDAS.includes(ext)) {
    throw new AppError(400, 'Extensión de archivo inválida. Solo .csv o .json', 'EXTENSION_INVALIDA');
  }

  const proveedor = await proveedorRepo.buscarPorId(proveedorId);
  if (!proveedor) {
    throw new AppError(404, 'proveedorId no existe', 'PROVEEDOR_NO_ENCONTRADO');
  }
  if (!proveedor.activo) {
    throw new AppError(409, 'El proveedor está inactivo, no puede recibir importaciones', 'PROVEEDOR_INACTIVO');
  }

  // Se crea en 'pending'. El worker (Fase 3) es quien lo pasa a 'processing'.
  const job = await importRepo.crear({
    usuarioId,
    proveedorId,
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

  return { importJobId: job._id.toString(), estado: job.estado };
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
    proveedorId: job.proveedorId,
    estado: job.estado,
    total: job.total,
    procesados: job.procesados,
    exitosos: job.exitosos,
    fallidos: job.fallidos,
    porcentaje,
    errores: job.errores,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

async function listarImports({ page = 1, limit = 20 }) {
  const limitFinal = Math.min(parseInt(limit, 10) || 20, 100);
  const pageFinal = Math.max(parseInt(page, 10) || 1, 1);

  const [data, total] = await importRepo.listar({ page: pageFinal, limit: limitFinal });
  return { data, page: pageFinal, limit: limitFinal, total };
}

module.exports = { crearImport, obtenerImport, listarImports };
