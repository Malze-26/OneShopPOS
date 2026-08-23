import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import { getModels, TenantModels } from '../db/tenantModels';

const TENANT = 'test-tenant';

let mongoServer: MongoMemoryServer;
let managerToken: string;
let cashierToken: string;
let productId: string;
let supplierId: string;
let models: TenantModels;

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
  models = getModels(conn);
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

  // Every product has to name the supplier it was bought from, so seed one for
  // the product tests to buy from.
  const supplier = await models.Supplier.create({
    name: 'Test Distributors',
    storeId: 'STORE-TEST-001',
  });
  supplierId = String(supplier._id);

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
        sellingPrice: 250,
        costPrice: 180,
        stock: 100,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    // The SKU is issued from the category, not supplied by the client.
    expect(res.body.data).toMatchObject({ name: 'Test Rice 5kg', sku: 'GRO-001' });
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
        supplierId,
      });
    expect(res.status).toBe(403);
  });

  it('refuses a product that names no supplier', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Supplierless Rice',
        sellingPrice: 250,
        costPrice: 180,
        stock: 10,
        category: 'Groceries',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });

  it('refuses a product whose supplier does not exist', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Ghost Sourced Rice',
        sellingPrice: 250,
        costPrice: 180,
        stock: 10,
        category: 'Groceries',
        supplierId: 'Nobody Ltd',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
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

// ─── Category-derived SKUs ────────────────────────────────────────────────────

describe('Category-derived SKUs', () => {
  const createProduct = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ sellingPrice: 100, costPrice: 50, stock: 5, supplierId, ...body });

  const createCategory = (name: string) =>
    request(app)
      .post('/api/categories')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name });

  it('numbers products sequentially inside a category', async () => {
    const res = await createProduct({ name: 'Test Dhal 1kg', category: 'Groceries' });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('GRO-002');
  });

  it('builds the prefix from the initials of a multi-word category', async () => {
    const category = await createCategory('Soft Drinks & Water');
    expect(category.status).toBe(201);
    expect(category.body.data.skuPrefix).toBe('SDW');

    const res = await createProduct({ name: 'Cola 500ml', category: 'Soft Drinks & Water' });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('SDW-001');
  });

  it('previews the next SKU before the product is saved', async () => {
    const res = await request(app)
      .get('/api/products/next-sku')
      .query({ category: 'Soft Drinks & Water' })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ sku: 'SDW-002', prefix: 'SDW' });
  });

  it('rejects a SKU preview for a category that does not exist', async () => {
    const res = await request(app)
      .get('/api/products/next-sku')
      .query({ category: 'Nonexistent' })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(400);
  });

  it('replaces a client SKU that does not belong to the category', async () => {
    const res = await createProduct({
      name: 'Ginger Beer 500ml',
      category: 'Soft Drinks & Water',
      sku: 'GRO-900',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('SDW-002');
  });

  it('ignores a client SKU even when it fits the category', async () => {
    const res = await createProduct({
      name: 'Lime Soda 500ml',
      category: 'Soft Drinks & Water',
      sku: 'SDW-777',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('SDW-003');
  });

  it('gives a second category its own prefix', async () => {
    const category = await createCategory('Snacks');
    expect(category.status).toBe(201);
    expect(category.body.data.skuPrefix).toBe('SNA');
  });

  it('reissues the SKU when a product moves to another category', async () => {
    const created = await createProduct({ name: 'Cashew Pack', category: 'Snacks' });
    expect(created.body.data.sku).toBe('SNA-001');

    const moved = await request(app)
      .put(`/api/products/${created.body.data._id}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ category: 'Groceries' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.sku).toBe('GRO-003');
  });

  it('does not reuse the number a moved product gave up', async () => {
    const created = await createProduct({ name: 'Peanut Pack', category: 'Snacks' });
    expect(created.body.data.sku).toBe('SNA-002');
  });

  it('skips a number already taken by a product written outside the API', async () => {
    // A seed script or restore can drop products straight into the collection,
    // leaving the category counter behind the data. The next SKU must clear
    // what is actually there, not just what the counter remembers.
    const manager = await models.User.findOne({ email: 'manager@test.com' });
    await models.Product.create({
      name: 'Smuggled Chips',
      sku: 'SNA-050',
      sellingPrice: 100,
      costPrice: 50,
      category: 'Snacks',
      storeId: 'STORE-TEST-001',
      createdBy: manager!._id,
      supplierId,
      supplier: 'Test Distributors',
    });

    const preview = await request(app)
      .get('/api/products/next-sku')
      .query({ category: 'Snacks' })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(preview.body.data.sku).toBe('SNA-051');

    const res = await createProduct({ name: 'Wasabi Peas', category: 'Snacks' });
    expect(res.body.data.sku).toBe('SNA-051');
  });

  it('keeps the SKU when an edit leaves the category alone', async () => {
    const created = await createProduct({ name: 'Almond Pack', category: 'Snacks' });
    expect(created.body.data.sku).toBe('SNA-052');

    const edited = await request(app)
      .put(`/api/products/${created.body.data._id}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ sellingPrice: 120 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.sku).toBe('SNA-052');
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

// ─── The ledger invariant ─────────────────────────────────────────────────────

describe('stock always equals what was added minus what was removed', () => {
  let ledgerProductId: string;

  /** Replays a product's whole stock history the way the product page does. */
  const ledgerFor = async (id: string) => {
    const rows = await models.StockHistory.find({ product: id });
    return rows.reduce((total, r) => total + (r.type === 'add' ? r.quantity : -r.quantity), 0);
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Ledger Test Flour 1kg',
        sellingPrice: 300,
        costPrice: 200,
        stock: 30,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    ledgerProductId = res.body.data._id;
  });

  it('holds after the opening stock', async () => {
    expect(await ledgerFor(ledgerProductId)).toBe(30);
  });

  it('holds after editing the stock field directly', async () => {
    // The edit form writes stock straight onto the product; without a movement
    // to match, the history stops explaining what is on the shelf.
    const res = await request(app)
      .put(`/api/products/${ledgerProductId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ stock: 18 });
    expect(res.status).toBe(200);

    const product = await models.Product.findById(ledgerProductId);
    expect(product!.stock).toBe(18);
    expect(await ledgerFor(ledgerProductId)).toBe(18);
  });

  it('holds after receiving goods and adjusting by hand', async () => {
    await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: ledgerProductId, quantityReceived: 25, costPrice: 200 }] });

    await request(app)
      .post(`/api/products/${ledgerProductId}/adjust-stock`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ type: 'remove', quantity: 6, reason: 'Damaged in storage' });

    const product = await models.Product.findById(ledgerProductId);
    expect(product!.stock).toBe(37);
    expect(await ledgerFor(ledgerProductId)).toBe(37);
  });
});

// ─── E-com order despatch ─────────────────────────────────────────────────────

describe('E-com order despatch', () => {
  let orderProductId: string;

  const makeOrder = async (orderId: string) => {
    const conn = mongoose.connection.useDb(TENANT, { useCache: true });
    return conn.collection('orders').insertOne({
      orderId,
      source: 'online',
      customerName: 'Web Shopper',
      items: [{ product: new mongoose.Types.ObjectId(orderProductId), quantity: 4, price: 100 }],
      orderItems: [{ product: new mongoose.Types.ObjectId(orderProductId), quantity: 4, price: 100 }],
      subtotal: 400,
      total: 400,
      status: 'pending',
      orderStatus: 'pending',
      paymentMethod: 'cash-on-delivery',
      paymentStatus: 'paid',
      storeId: 'STORE-TEST-001',
      createdBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Web Sold Sugar 1kg',
        sellingPrice: 100,
        costPrice: 70,
        stock: 50,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    orderProductId = res.body.data._id;
  });

  it('takes stock out when a manager marks an order delivered', async () => {
    // The status override used to write the new status straight to the
    // collection, despatching the goods without touching inventory.
    const { insertedId } = await makeOrder('ORD-TEST-01');
    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .patch(`/api/orders/${insertedId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before - 4);

    const movements = await models.StockHistory.find({ product: orderProductId, type: 'remove' });
    expect(movements.filter((m) => m.reason.includes('ORD-TEST-01'))).toHaveLength(1);
  });

  it('never takes the same order stock twice', async () => {
    const { insertedId } = await makeOrder('ORD-TEST-02');
    const before = (await models.Product.findById(orderProductId))!.stock;

    for (const status of ['processing', 'delivered']) {
      const res = await request(app)
        .patch(`/api/orders/${insertedId}/status`)
        .set('OneShop-Tenant-ID', TENANT)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status });
      expect(res.status).toBe(200);
    }

    // Two fulfilment transitions, one despatch.
    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before - 4);

    const movements = await models.StockHistory.find({ product: orderProductId, type: 'remove' });
    expect(movements.filter((m) => m.reason.includes('ORD-TEST-02'))).toHaveLength(1);
  });

  it('leaves stock alone when an order is cancelled', async () => {
    const { insertedId } = await makeOrder('ORD-TEST-03');
    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .patch(`/api/orders/${insertedId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before);

    const movements = await models.StockHistory.find({ product: orderProductId, type: 'remove' });
    expect(movements.filter((m) => m.reason.includes('ORD-TEST-03'))).toHaveLength(0);
  });
});

// ─── Goods received notes ─────────────────────────────────────────────────────

describe('Goods received notes', () => {
  let grnProductId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Delivered Lentils 1kg',
        sellingPrice: 400,
        costPrice: 300,
        stock: 0,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    grnProductId = res.body.data._id;
  });

  const receive = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ items: [{ productId: grnProductId, quantityReceived: 12, costPrice: 300 }], ...body });

  it('links the note to the supplier that delivered the goods', async () => {
    const res = await receive({ supplierId });
    expect(res.status).toBe(201);
    expect(String(res.body.data.supplierId)).toBe(supplierId);
    expect(res.body.data.supplier).toBe('Test Distributors');
  });

  it('labels each line from the product it references', async () => {
    const res = await receive({ supplierId });
    expect(res.status).toBe(201);
    // The note quotes the product's own name and SKU, not whatever the client
    // sent, so a renumbered SKU can never leave the paperwork out of date.
    const product = await models.Product.findById(grnProductId);
    expect(res.body.data.items[0]).toMatchObject({
      sku: product!.sku,
      productName: product!.name,
    });
  });

  it('records a Stock In movement naming the note and supplier', async () => {
    const res = await receive({ supplierId });
    expect(res.status).toBe(201);

    // Stock history is what the product page shows to explain where the units
    // on the shelf came from, so a delivery has to leave one behind.
    const movements = await models.StockHistory.find({ product: grnProductId, type: 'add' });
    const fromThisNote = movements.filter((m) => m.reason.includes(res.body.data.grnNumber));
    expect(fromThisNote).toHaveLength(1);
    expect(fromThisNote[0].quantity).toBe(12);
    expect(fromThisNote[0].reason).toBe(`GRN: ${res.body.data.grnNumber} — Test Distributors`);
  });

  it('refuses goods received from no supplier', async () => {
    const res = await receive({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });

  it('refuses goods received from a supplier that does not exist', async () => {
    const res = await receive({ supplierId: 'Nobody Ltd' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });
});
