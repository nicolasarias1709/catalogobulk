// tests/imports.test.js
// Fase 2: solo probamos que el endpoint recibe, valida y encola.
// El contenido real del procesamiento (Fase 3) no se prueba aquí.

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { conectarMongo } = require('../src/config/db');
const crearApp = require('../src/app');
const { limpiarBaseDeDatos, cerrarConexiones, crearUsuarioConToken } = require('./testUtils');
const Proveedor = require('../src/models/proveedor.model');
const { importQueue } = require('../src/queues/import.queue');

let app;

const ARCHIVO_CSV = path.join(__dirname, 'fixtures', 'catalogo-prueba.csv');
const ARCHIVO_INVALIDO = path.join(__dirname, 'fixtures', 'catalogo-prueba.txt');

beforeAll(async () => {
  await conectarMongo();
  app = crearApp();

  fs.mkdirSync(path.dirname(ARCHIVO_CSV), { recursive: true });
  fs.writeFileSync(
    ARCHIVO_CSV,
    'sku,nombre,precio,stock,categoria,descripcion,imagenUrl\nSKU-001,Camiseta,29.99,10,ropa,,\n'
  );
  fs.writeFileSync(ARCHIVO_INVALIDO, 'esto no es un csv ni json');
});

afterEach(async () => {
  await limpiarBaseDeDatos();
});

afterAll(async () => {
  await importQueue.close();
  await cerrarConexiones();
  fs.rmSync(path.dirname(ARCHIVO_CSV), { recursive: true, force: true });
});

async function crearProveedorDePrueba(overrides = {}) {
  return Proveedor.create({ nombre: 'Acme Corp', slug: 'acme-corp', activo: true, ...overrides });
}

describe('Imports', () => {
  test('user recibe 403 al intentar subir un import', async () => {
    const tokenUser = await crearUsuarioConToken({ email: 'user1@demo.com', rol: 'user' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenUser}`)
      .field('proveedorId', proveedor._id.toString())
      .attach('archivo', ARCHIVO_CSV);

    expect(res.status).toBe(403);
  });

  test('admin sube un archivo valido y recibe 202 con importJobId en pending', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin1@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', proveedor._id.toString())
      .attach('archivo', ARCHIVO_CSV);

    expect(res.status).toBe(202);
    expect(res.body.importJobId).toBeDefined();
    expect(res.body.estado).toBe('pending');
  });

  test('extension invalida devuelve 400', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin2@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', proveedor._id.toString())
      .attach('archivo', ARCHIVO_INVALIDO);

    expect(res.status).toBe(400);
  });

  test('proveedorId inexistente devuelve 404', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin3@demo.com', rol: 'admin' });

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', '000000000000000000000000')
      .attach('archivo', ARCHIVO_CSV);

    expect(res.status).toBe(404);
  });

  test('proveedor inactivo devuelve 409', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin4@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba({ nombre: 'Inactivo Corp', slug: 'inactivo-corp', activo: false });

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', proveedor._id.toString())
      .attach('archivo', ARCHIVO_CSV);

    expect(res.status).toBe(409);
  });

  test('sin archivo devuelve 400', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin5@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', proveedor._id.toString());

    expect(res.status).toBe(400);
  });

  test('dueño puede consultar su import, otro user no', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin6@demo.com', rol: 'admin' });
    const tokenOtro = await crearUsuarioConToken({ email: 'otro@demo.com', rol: 'user' });
    const proveedor = await crearProveedorDePrueba();

    const subida = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('proveedorId', proveedor._id.toString())
      .attach('archivo', ARCHIVO_CSV);

    const { importJobId } = subida.body;

    const propio = await request(app)
      .get(`/api/imports/${importJobId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(propio.status).toBe(200);
    expect(propio.body.estado).toBe('pending');

    const ajeno = await request(app)
      .get(`/api/imports/${importJobId}`)
      .set('Authorization', `Bearer ${tokenOtro}`);
    expect(ajeno.status).toBe(403);
  });
});
