// tests/workerLogic.test.js
// A diferencia de los otros tests, estos NO tocan Mongo ni Redis: prueban
// rowProcessor.js y fileReader.js de forma aislada, porque son funciones
// puras. Sirven para verificar la sección 6.3/6.4 del contrato sin
// necesitar levantar nada.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { validarYNormalizarFila } = require('../src/workers/rowProcessor');
const { leerArchivoCatalogo } = require('../src/workers/fileReader');

describe('validarYNormalizarFila', () => {
  test('normaliza una fila válida según sección 6.4', () => {
    const r = validarYNormalizarFila({
      sku: 'sku-001',
      nombre: 'Camiseta  Azul', // doble espacio
      precio: 29.999,
      stock: '10',
      categoria: 'Ropa',
      descripcion: '  Algodón  ',
      imagenUrl: 'https://cdn.demo.com/img.jpg',
    });

    expect(r.valido).toBe(true);
    expect(r.fila).toEqual({
      sku: 'SKU-001',
      nombre: 'Camiseta Azul',
      precio: 30, // redondeado a 2 decimales
      stock: 10,
      categoria: 'ropa',
      descripcion: 'Algodón',
      imagenUrl: 'https://cdn.demo.com/img.jpg',
    });
  });

  test('imagenUrl inválida es advertencia, NO rechazo', () => {
    const r = validarYNormalizarFila({
      sku: 'SKU-002', nombre: 'Taza', precio: 10, stock: 5, categoria: 'hogar', imagenUrl: 'no-es-url',
    });
    expect(r.valido).toBe(true);
    expect(r.fila.imagenUrl).toBeNull();
    expect(r.advertencia).toBe('imagenUrl inválida, ignorada');
  });

  test('rechaza sku vacío', () => {
    const r = validarYNormalizarFila({ sku: '', nombre: 'X', precio: 1, stock: 1, categoria: 'ropa' });
    expect(r.valido).toBe(false);
    expect(r.motivo).toBe('sku vacío');
  });

  test('rechaza precio inválido', () => {
    const r = validarYNormalizarFila({ sku: 'SKU-003', nombre: 'X', precio: 'no-numero', stock: 1, categoria: 'ropa' });
    expect(r.valido).toBe(false);
    expect(r.motivo).toBe('precio inválido');
  });

  test('rechaza stock negativo', () => {
    const r = validarYNormalizarFila({ sku: 'SKU-004', nombre: 'X', precio: 1, stock: -5, categoria: 'ropa' });
    expect(r.valido).toBe(false);
    expect(r.motivo).toBe('stock inválido');
  });
});

describe('leerArchivoCatalogo', () => {
  const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogobulk-'));

  test('lee un CSV válido', () => {
    const ruta = path.join(dirTmp, 'ok.csv');
    fs.writeFileSync(ruta, 'sku,nombre,precio,stock,categoria\nSKU-001,Camiseta,10,5,ropa\n');
    const filas = leerArchivoCatalogo(ruta);
    expect(filas).toHaveLength(1);
    expect(filas[0].sku).toBe('SKU-001');
  });

  test('lee un JSON válido', () => {
    const ruta = path.join(dirTmp, 'ok.json');
    fs.writeFileSync(ruta, JSON.stringify([{ sku: 'SKU-001', nombre: 'Taza', precio: 5, stock: 1, categoria: 'hogar' }]));
    const filas = leerArchivoCatalogo(ruta);
    expect(filas).toHaveLength(1);
  });

  test('CSV sin columnas obligatorias lanza error', () => {
    const ruta = path.join(dirTmp, 'malo.csv');
    fs.writeFileSync(ruta, 'sku,nombre\nSKU-001,Camiseta\n');
    expect(() => leerArchivoCatalogo(ruta)).toThrow(/Header inválido/);
  });

  test('JSON corrupto lanza error', () => {
    const ruta = path.join(dirTmp, 'malo.json');
    fs.writeFileSync(ruta, '{ esto no es json valido');
    expect(() => leerArchivoCatalogo(ruta)).toThrow();
  });
});
