// tests/productos.test.js

const request = require('supertest');
const { conectarMongo } = require('../src/config/db');
const crearApp = require('../src/app');
const { limpiarBaseDeDatos, cerrarConexiones, crearUsuarioConToken } = require('./testUtils');
const Proveedor = require('../src/models/proveedor.model');

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

async function crearProveedorDePrueba() {
  return Proveedor.create({ nombre: 'Acme Corp', slug: 'acme-corp' });
}

describe('Productos', () => {
  test('user recibe 403 al intentar crear un producto', async () => {
    const tokenUser = await crearUsuarioConToken({ email: 'user1@demo.com', rol: 'user' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenUser}`)
      .send({
        sku: 'SKU-001',
        nombre: 'Camiseta',
        precio: 10,
        stock: 5,
        categoria: 'ropa',
        proveedorId: proveedor._id,
      });

    expect(res.status).toBe(403);
  });

  test('admin puede crear un producto -> 201', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin1@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba();

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        sku: 'SKU-002',
        nombre: 'Taza',
        precio: 15.5,
        stock: 0,
        categoria: 'hogar',
        proveedorId: proveedor._id,
      });

    expect(res.status).toBe(201);
    expect(res.body.disponible).toBe(false);
  });

  test('sku duplicado -> 409 tipado', async () => {
    const tokenAdmin = await crearUsuarioConToken({ email: 'admin2@demo.com', rol: 'admin' });
    const proveedor = await crearProveedorDePrueba();

    const payload = {
      sku: 'SKU-003',
      nombre: 'Audífonos',
      precio: 89.9,
      stock: 10,
      categoria: 'electronica',
      proveedorId: proveedor._id,
    };

    await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload);

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('SKU_DUPLICADO');
  });

  test('sin token -> 401', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(401);
  });
});
