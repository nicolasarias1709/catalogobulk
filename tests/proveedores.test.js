// tests/proveedores.test.js

const request = require('supertest');
const { conectarMongo } = require('../src/config/db');
const crearApp = require('../src/app');
const { limpiarBaseDeDatos, cerrarConexiones, crearUsuarioConToken } = require('./testUtils');
const Producto = require('../src/models/producto.model');

let app;

beforeAll(async () => {
  await conectarMongo();
  app = crearApp();
});

afterEach(async () => {
  await limpiarBaseDeDatos();
});

afterAll(async () => {
  await cerrarConexiones();
});

describe('Proveedores', () => {
  test('user recibe 403 en POST de proveedores', async () => {
    const tokenUser = await crearUsuarioConToken({ email: 'user2@demo.com', rol: 'user' });

    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({ nombre: 'Acme Corp', slug: 'acme-corp' });

    expect(res.status).toBe(403);
  });

  test('admin crea un proveedor y queda activo: true por defecto', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin3@demo.com', rol: 'admin' });

    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Beta Corp', slug: 'beta-corp' });

    expect(res.status).toBe(201);
    expect(res.body.activo).toBe(true);
  });

  test('slug duplicado -> 409', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin4@demo.com', rol: 'admin' });

    await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Gamma Corp', slug: 'gamma-corp' });

    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Gamma Corp 2', slug: 'gamma-corp' });

    expect(res.status).toBe(409);
  });

  test('eliminar proveedor con productos asociados -> 409 (integridad)', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin5@demo.com', rol: 'admin' });

    const resProveedor = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Delta Corp', slug: 'delta-corp' });

    const proveedorId = resProveedor.body._id ?? resProveedor.body.id;

    await Producto.create({
      sku: 'SKU-100',
      nombre: 'Producto asociado',
      precio: 5,
      stock: 1,
      categoria: 'varios',
      proveedorId,
    });

    const res = await request(app)
      .delete(`/api/proveedores/${proveedorId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(409);
  });
});
