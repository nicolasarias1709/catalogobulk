// src/repositories/import.repository.js
// El repository nunca sabe de req/res, solo habla con Mongoose.

const mongoose = require('mongoose');
const ImportJob = require('../models/importJob.model');

function crear(data) {
  return ImportJob.create(data);
}

function buscarPorId(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return ImportJob.findById(id);
}

function actualizar(id, data) {
  return ImportJob.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    context: 'query',
  });
}

function listar({ page, limit }) {
  const skip = (page - 1) * limit;
  return Promise.all([
    ImportJob.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    ImportJob.countDocuments(),
  ]);
}

module.exports = { crear, buscarPorId, actualizar, listar };
