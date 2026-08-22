import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import { getModels } from '../db/tenantModels';

const TENANT = 'test-tenant';

let mongoServer: MongoMemoryServer;
let managerToken: string;
let cashierToken: string;
let productId: string;

// ─── Setup & Teardown ─────────────────────────────────────────────────────────

// Long timeout: MongoMemoryServer downloads a binary on first run (~30-60 s).
beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-jest';
  process.env.JWT_EXPIRES_IN = '1h';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Seed Manager directly — the register endpoint requires an existing Manager
  // token, so we can't use the API to create the first user.
  const conn = mongoose.connection.useDb(TENANT, { useCache: true });
  const models = getModels(conn);
  await models.User.create({
    name: 'Test Manager',
    email: 'manager@test.com',
    password: 'Password123',
    role: 'Manager',
    storeId: 'STORE-TEST-001',
  });

  // Products must reference a category that already exists, so seed the one
  // the product tests use.
  await models.Category.create({
    name: 'Groceries',
    icon: 'shopping-basket',
    color: '#155dfc',
    storeId: 'STORE-TEST-001',
  });

  const managerRes = await request(app)
    .post('/api/auth/login')
    .set('OneShop-Tenant-ID', TENANT)
    .send({ email: 'manager@test.com', password: 'Password123' });
  expect(managerRes.status).toBe(200);
  managerToken = managerRes.body.token;

  // Register Cashier via the API (needs a valid Manager token)
  const registerRes = await request(app)
    .post('/api/auth/register')
    .set('OneShop-Tenant-ID', TENANT)
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ name: 'Test Cashier', email: 'cashier@test.com', password: 'Password123', role: 'Cashier' });
  expect(registerRes.status).toBe(201);

  const cashierRes = await request(app)
    .post('/api/auth/login')
    .set('OneShop-Tenant-ID', TENANT)
    .send({ email: 'cashier@test.com', password: 'Password123' });
  expect(cashierRes.status).toBe(200);
  cashierToken = cashierRes.body.token;
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 15_000);

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('Auth guard', () => {
  it('rejects requests without tenant header', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(400);
  });

  it('rejects requests without auth token', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('OneShop-Tenant-ID', TENANT);
    expect(res.status).toBe(401);
  });
});

// ─── Product CRUD ─────────────────────────────────────────────────────────────

describe('Product CRUD', () => {
  it('Manager can create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Test Rice 5kg',
        sku: 'RICE-5KG-001',
        sellingPrice: 250,
        costPrice: 180,
        stock: 100,
        category: 'Groceries',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Test Rice 5kg', sku: 'RICE-5KG-001' });
    productId = res.body.data._id;
  });

  it('Cashier cannot create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Unauthorized Product',
        sku: 'NO-ACCESS-001',
        sellingPrice: 10,
        costPrice: 5,
        stock: 0,
        category: 'Misc',
      });
    expect(res.status).toBe(403);
  });

  it('Cashier can list products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Manager can get a single product', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(productId);
  });

  it('returns 404 for unknown product', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/products/${fakeId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(404);
  });

  it('Manager can update a product', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ sellingPrice: 270 });
    expect(res.status).toBe(200);
    expect(res.body.data.sellingPrice).toBe(270);
  });
});

// ─── Stock adjustment ─────────────────────────────────────────────────────────

describe('Stock adjustment', () => {
  it('Manager can add stock', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/adjust-stock`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ type: 'add', quantity: 50, reason: 'Restock' });
    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(150);
  });

  it('Manager can remove stock', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/adjust-stock`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ type: 'remove', quantity: 20, reason: 'Spoilage' });
    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(130);
  });

  it('Cashier cannot adjust stock', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/adjust-stock`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ type: 'add', quantity: 10, reason: 'Unauthorized' });
    expect(res.status).toBe(403);
  });
});

// ─── Product deletion ─────────────────────────────────────────────────────────

describe('Product deletion', () => {
  it('Cashier cannot delete a product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(res.status).toBe(403);
  });

  it('Manager can delete a product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });

  it('deleted product returns 404', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(404);
  });
});
