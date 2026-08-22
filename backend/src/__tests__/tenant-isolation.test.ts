import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app';
import { getModels } from '../db/tenantModels';

const TENANT_A = 'tenant-alpha';
const TENANT_B = 'tenant-beta';

let mongoServer: MongoMemoryServer;
let tokenA: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-jest';
  process.env.JWT_EXPIRES_IN = '1h';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // A manager in each tenant, same credentials — only the database differs.
  for (const [tenant, store] of [[TENANT_A, 'STORE-A'], [TENANT_B, 'STORE-B']]) {
    const models = getModels(mongoose.connection.useDb(tenant, { useCache: true }));
    const manager = await models.User.create({
      name: `Manager ${store}`,
      email: 'manager@test.com',
      password: 'Password123',
      role: 'Manager',
      storeId: store,
    });
    await models.Product.create({
      createdBy: manager._id,
      name: `${store} Widget`,
      sku: `SKU-${store}`,
      sellingPrice: 100,
      costPrice: 50,
      category: 'General',
      stock: 5,
      storeId: store,
    });
  }

  const res = await request(app)
    .post('/api/auth/login')
    .set('OneShop-Tenant-ID', TENANT_A)
    .send({ email: 'manager@test.com', password: 'Password123' });
  expect(res.status).toBe(200);
  tokenA = res.body.token;
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 15_000);

describe('Cross-tenant session replay', () => {
  it('binds the issued token to the tenant that issued it', () => {
    const claims = jwt.verify(tokenA, process.env.JWT_SECRET as string) as { tenant?: string };
    expect(claims.tenant).toBe(TENANT_A);
  });

  it('serves tenant A its own data with its own token', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('OneShop-Tenant-ID', TENANT_A)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const names = (res.body.data ?? res.body).map((p: any) => p.name);
    expect(names).toContain('STORE-A Widget');
  });

  it("refuses tenant A's token when aimed at tenant B", async () => {
    const res = await request(app)
      .get('/api/products')
      .set('OneShop-Tenant-ID', TENANT_B)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/different store/i);
  });

  it("refuses writes into tenant B with tenant A's token", async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT_B)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Injected', sku: 'SKU-EVIL', sellingPrice: 1, costPrice: 1, category: 'General' });

    expect(res.status).toBe(401);
  });

  it('leaves tenant B untouched after the attempts', async () => {
    const models = getModels(mongoose.connection.useDb(TENANT_B, { useCache: true }));
    const names = (await models.Product.find({}).lean()).map((p: any) => p.name);
    expect(names).toEqual(['STORE-B Widget']);
  });
});
