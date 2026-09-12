// tests/auth.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const { conectarMongo } = require('../src/config/db');
const crearApp = require('../src/app');
const { limpiarBaseDeDatos, cerrarConexiones } = require('./testUtils');

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

describe('Auth', () => {
  test('POST /api/auth/register crea un usuario y no expone el password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@demo.com', password: 'secreta123', rol: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('admin@demo.com');
    expect(res.body.rol).toBe('admin');
    expect(res.body.password).toBeUndefined();
  });

  test('POST /api/auth/register con email duplicado -> 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@demo.com', password: 'secreta123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@demo.com', password: 'otraClave123' });

    expect(res.status).toBe(409);
  });

  test('POST /api/auth/login con credenciales correctas -> 200 y token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@demo.com', password: 'secreta123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@demo.com', password: 'secreta123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login con password incorrecto -> 401', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login2@demo.com', password: 'secreta123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@demo.com', password: 'incorrecta' });

    expect(res.status).toBe(401);
  });
});
