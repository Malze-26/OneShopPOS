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
  it('Manager can create a product, starting at zero stock', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Test Rice 5kg',
        sellingPrice: 250,
        costPrice: 180,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    // The SKU is issued from the category, not supplied by the client.
    expect(res.body.data).toMatchObject({ name: 'Test Rice 5kg', sku: 'GRO-001' });
    // Creating a product is master-data setup, not a stock transaction — it
    // has nothing on the shelf until a GRN actually brings goods in.
    expect(res.body.data.stock).toBe(0);
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
        category: 'Groceries',
        supplierId: 'Nobody Ltd',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });

  it('ignores a client-supplied stock value — a product always starts at zero', async () => {
    // A category of its own, so this doesn't perturb the sequential SKU
    // numbers the "Category-derived SKUs" tests expect from 'Groceries'.
    await request(app)
      .post('/api/categories')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Stock Ignore Test Category' });

    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Smuggled Stock Rice',
        sellingPrice: 250,
        costPrice: 180,
        stock: 500,
        category: 'Stock Ignore Test Category',
        supplierId,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.stock).toBe(0);
  });

  it('refuses to create a second record for a product that already exists', async () => {
    const category = 'Stock Ignore Test Category';

    const first = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Carrot', sellingPrice: 80, costPrice: 40, category, supplierId });
    expect(first.status).toBe(201);

    // Out of stock is still the same product — case and stray whitespace
    // must not be enough to dodge the check either.
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: '  carrot  ', sellingPrice: 85, costPrice: 45, category, supplierId });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain(first.body.data.sku);

    const products = await models.Product.find({ name: { $regex: /^carrot$/i } });
    expect(products).toHaveLength(1);
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
      .send({ sellingPrice: 100, costPrice: 50, supplierId, ...body });

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
  it('refuses to adjust stock for a product that has never received a GRN', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/adjust-stock`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ type: 'add', quantity: 10, reason: 'Attempted bypass' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/GRN|goods/i);
  });

  it('brings the product into stock via a GRN', async () => {
    const res = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId, quantityReceived: 100, costPrice: 180 }] });
    expect(res.status).toBe(201);

    const product = await models.Product.findById(productId);
    expect(product!.stock).toBe(100);
  });

  it('Manager can add stock once a GRN exists', async () => {
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

// ─── Low stock excludes expired stock ─────────────────────────────────────────

describe('low stock counts', () => {
  const daysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const addProduct = async (name: string, expiryDate: string | null) => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name,
        sellingPrice: 100,
        costPrice: 60,
        lowStockThreshold: 10,
        category: 'Groceries',
        supplierId,
        expiryDate,
      });
    expect(res.status).toBe(201);

    // A product with no stock is "out of stock", not "low stock" — a GRN has
    // to bring it in before it can register as running low.
    const grn = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: res.body.data._id, quantityReceived: 2, costPrice: 60 }] });
    expect(grn.status).toBe(201);

    return res.body.data;
  };

  let freshSku: string;
  let expiredSku: string;

  beforeAll(async () => {
    freshSku = (await addProduct('Low But Fresh Milk', daysFromNow(30))).sku;
    expiredSku = (await addProduct('Low And Expired Milk', daysFromNow(-3))).sku;
    // Sold by weight, no expiry tracked at all — must still count as low.
    await addProduct('Low Non Perishable Soap', null);
  });

  const lowStock = () =>
    request(app)
      .get('/api/alerts/low-stock')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);

  it('lists stock that is running low and still sellable', async () => {
    const res = await lowStock();
    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain(freshSku);
  });

  it('leaves expired stock out — it needs returning, not reordering', async () => {
    const res = await lowStock();
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).not.toContain(expiredSku);
  });

  it('still counts products that track no expiry date', async () => {
    const res = await lowStock();
    const names = res.body.data.map((p: { name: string }) => p.name);
    expect(names).toContain('Low Non Perishable Soap');
  });

  it('keeps the dashboard card in step with the alert list', async () => {
    const [alerts, summary] = await Promise.all([
      lowStock(),
      request(app)
        .get('/api/dashboard/summary')
        .set('OneShop-Tenant-ID', TENANT)
        .set('Authorization', `Bearer ${managerToken}`),
    ]);
    expect(summary.status).toBe(200);
    expect(summary.body.lowStockItems).toBe(alerts.body.data.length);
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
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    ledgerProductId = res.body.data._id;
  });

  it('starts at zero with an empty ledger', async () => {
    const product = await models.Product.findById(ledgerProductId);
    expect(product!.stock).toBe(0);
    expect(await ledgerFor(ledgerProductId)).toBe(0);
  });

  it('refuses a direct stock edit before any GRN has been received', async () => {
    const res = await request(app)
      .put(`/api/products/${ledgerProductId}`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ stock: 18 });
    expect(res.status).toBe(400);

    const product = await models.Product.findById(ledgerProductId);
    expect(product!.stock).toBe(0);
  });

  it('holds after receiving the opening stock through a GRN', async () => {
    const res = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: ledgerProductId, quantityReceived: 30, costPrice: 200 }] });
    expect(res.status).toBe(201);

    expect(await ledgerFor(ledgerProductId)).toBe(30);
  });

  it('holds after editing the stock field directly, now that a GRN exists', async () => {
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

  it('holds after receiving more goods and adjusting by hand', async () => {
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

// ─── E-com orders: stock stays with the e-com website ─────────────────────────
//
// The e-com website's own backend writes directly into this tenant's
// `products`/`stockhistories` collections for orders it despatches (reason
// "Online transaction <id>"). This backend used to *also* release/restore
// stock for the same orders, and the two uncoordinated writers double- (and
// sometimes triple-) deducted the same sale. Stock is now never touched here
// for a document carrying an `orderStatus` field (the e-com website's marker)
// — this backend only keeps `orderStatus`/`status` in sync for reporting.

describe('E-com orders: stock stays with the e-com website', () => {
  let orderProductId: string;

  const makeOrder = async (orderId: string, overrides: Record<string, unknown> = {}) => {
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
      ...overrides,
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
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    orderProductId = res.body.data._id;

    const grn = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: orderProductId, quantityReceived: 50, costPrice: 70 }] });
    expect(grn.status).toBe(201);
  });

  it('syncs orderStatus for a raw order but never touches stock', async () => {
    // COD + pending is the one rule that actually transitions the status.
    const { insertedId } = await makeOrder('ORD-TEST-01', { paymentStatus: 'pending' });
    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .get('/api/orders')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);

    // COD + pending still gets despatched to 'processing' for the Orders UI...
    const conn = mongoose.connection.useDb(TENANT, { useCache: true });
    const order = await conn.collection('orders').findOne({ _id: insertedId });
    expect(order!.orderStatus).toBe('processing');

    // ...but no stock or Stock History moves for it from this side.
    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before);
    const movements = await models.StockHistory.find({ reason: { $regex: 'ORD-TEST-01' } });
    expect(movements).toHaveLength(0);
  });

  it('a manager marking an e-com order delivered relabels it without touching stock', async () => {
    const { insertedId } = await makeOrder('ORD-TEST-02');
    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .patch(`/api/orders/${insertedId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.data.orderStatus).toBe('delivered');

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before);
    const movements = await models.StockHistory.find({ reason: { $regex: 'ORD-TEST-02' } });
    expect(movements).toHaveLength(0);
  });

  it('a manager cancelling an e-com order does not restore stock either', async () => {
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
    const movements = await models.StockHistory.find({ reason: { $regex: 'ORD-TEST-03' } });
    expect(movements).toHaveLength(0);
  });

  it('leaves stock alone for an order the website wrote directly into a terminal state', async () => {
    // Even the old catch-up logic for an order landing straight at
    // 'delivered'/'success' with no `stockReleased` flag must stay a no-op now.
    const { insertedId } = await makeOrder('ORD-TEST-04', {
      status: 'success',
      orderStatus: 'success',
      paymentMethod: 'payhere',
      paymentStatus: 'success',
    });
    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .get('/api/orders')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before);
    const movements = await models.StockHistory.find({ reason: { $regex: 'ORD-TEST-04' } });
    expect(movements).toHaveLength(0);

    const conn = mongoose.connection.useDb(TENANT, { useCache: true });
    const order = await conn.collection('orders').findOne({ _id: insertedId });
    expect(order!.stockReleased).toBeFalsy();
  });
});

// ─── Backend-created online orders: this backend remains the sole authority ───
//
// An order placed through this backend's own POST /api/orders (source
// 'online', not the e-com website) carries no `orderStatus` field, so it is
// never mistaken for an e-com order — no external system is involved, and
// this backend still owns despatching its stock.

describe('Backend-created online order despatch', () => {
  let orderProductId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Backend Online Order Rice 5kg',
        sellingPrice: 900,
        costPrice: 700,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    orderProductId = res.body.data._id;

    const grn = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: orderProductId, quantityReceived: 30, costPrice: 700 }] });
    expect(grn.status).toBe(201);
  });

  const placeOrder = (orderId: string, quantity: number) =>
    request(app)
      .post('/api/orders')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        orderId,
        source: 'online',
        customerName: 'Phone Shopper',
        items: [{
          product: orderProductId,
          productName: 'Backend Online Order Rice 5kg',
          sku: 'TEST-BOL',
          quantity,
          unitPrice: 900,
          subtotal: 900 * quantity,
        }],
        subtotal: 900 * quantity,
        total: 900 * quantity,
        paymentMethod: 'Card',
      });

  it('takes stock out when a manager marks it delivered, dated to when it was placed', async () => {
    const create = await placeOrder('BOL-TEST-01', 2);
    expect(create.status).toBe(201);
    const orderDbId = create.body.data._id;

    const before = (await models.Product.findById(orderProductId))!.stock;

    const res = await request(app)
      .patch(`/api/orders/${orderDbId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before - 2);

    const movements = await models.StockHistory.find({ product: orderProductId, type: 'remove' });
    const movement = movements.find((m) => m.reason.includes('BOL-TEST-01'));
    expect(movement).toBeDefined();
    // Dated to the order's own placement, not to whenever the override ran.
    expect(new Date(movement!.get('createdAt')).toISOString()).toBe(new Date(create.body.data.createdAt).toISOString());
  });

  it('never takes the same order stock twice', async () => {
    const create = await placeOrder('BOL-TEST-02', 2);
    expect(create.status).toBe(201);
    const orderDbId = create.body.data._id;
    const before = (await models.Product.findById(orderProductId))!.stock;

    for (const status of ['processing', 'delivered']) {
      const res = await request(app)
        .patch(`/api/orders/${orderDbId}/status`)
        .set('OneShop-Tenant-ID', TENANT)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status });
      expect(res.status).toBe(200);
    }

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before - 2);
    const movements = await models.StockHistory.find({ product: orderProductId, type: 'remove' });
    expect(movements.filter((m) => m.reason.includes('BOL-TEST-02'))).toHaveLength(1);
  });

  it('restores stock when cancelled after despatch', async () => {
    const create = await placeOrder('BOL-TEST-03', 3);
    expect(create.status).toBe(201);
    const orderDbId = create.body.data._id;
    const before = (await models.Product.findById(orderProductId))!.stock;

    await request(app)
      .patch(`/api/orders/${orderDbId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'delivered' });

    const res = await request(app)
      .patch(`/api/orders/${orderDbId}/status`)
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);

    const after = (await models.Product.findById(orderProductId))!.stock;
    expect(after).toBe(before);
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

  it('finds the note by the product it delivered, so the supplier can be traced', async () => {
    const created = await receive({ supplierId });
    expect(created.status).toBe(201);

    // The list is opened to answer "who supplied this?", so the product name
    // has to reach the note even though it only lives on the lines.
    const res = await request(app)
      .get('/api/stocks/grns')
      .query({ search: 'Lentils' })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);

    const found = res.body.data.find((g: { grnNumber: string }) => g.grnNumber === created.body.data.grnNumber);
    expect(found).toBeDefined();
    expect(found.supplier).toBe('Test Distributors');
  });

  it('finds the note by the SKU of a product it delivered', async () => {
    const created = await receive({ supplierId });
    const product = await models.Product.findById(grnProductId);

    const res = await request(app)
      .get('/api/stocks/grns')
      .query({ search: product!.sku })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((g: { grnNumber: string }) => g.grnNumber === created.body.data.grnNumber)).toBe(true);
  });

  it('leaves out notes that never carried the product searched for', async () => {
    const res = await request(app)
      .get('/api/stocks/grns')
      .query({ search: 'Nothing Delivered This' })
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── CSV import ────────────────────────────────────────────────────────────────

describe('CSV import', () => {
  const importRows = (rows: Record<string, unknown>[]) =>
    request(app)
      .post('/api/products/bulk/import-csv')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ rows });

  it('carries is_weight_based onto the created product', async () => {
    const res = await importRows([
      {
        name: 'CSV Loose Rice 1kg',
        category: 'Groceries',
        supplier: 'Test Distributors',
        selling_price: 300,
        cost_price: 200,
        is_weight_based: true,
      },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    const product = await models.Product.findOne({ name: 'CSV Loose Rice 1kg' });
    expect(product!.isWeightBased).toBe(true);
    expect(product!.unit).toBe('kg');
  });

  it('ignores any stock value in the row and raises no GRN or stock movement', async () => {
    // Import is master-data setup, not a stock transaction — GRNs are
    // reserved for goods actually received through Receive Goods, so an
    // imported product starts at zero even if the row carries a stock column.
    const res = await importRows([
      {
        name: 'CSV Canned Tuna 200g',
        category: 'Groceries',
        supplier: 'Test Distributors',
        selling_price: 350,
        cost_price: 250,
        stock: 20,
      },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    const product = await models.Product.findOne({ name: 'CSV Canned Tuna 200g' });
    expect(product!.stock).toBe(0);
    expect(await models.GRN.findOne({ 'items.product': product!._id })).toBeNull();
    expect(await models.StockHistory.findOne({ product: product!._id })).toBeNull();
  });

  it('flags a row naming a product that already exists instead of creating a duplicate', async () => {
    const existing = await models.Product.findOne({ name: 'CSV Canned Tuna 200g' });

    const res = await importRows([
      {
        // Case and stray whitespace must not dodge the check either.
        name: '  csv canned tuna 200g  ',
        category: 'Groceries',
        supplier: 'Test Distributors',
        selling_price: 350,
        cost_price: 250,
      },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].errors[0]).toContain(existing!.sku);

    expect(await models.Product.countDocuments({ name: { $regex: /^csv canned tuna 200g$/i } })).toBe(1);
  });

  it('imports the first of two identically named rows and flags the second as a duplicate', async () => {
    const res = await importRows([
      {
        name: 'CSV Duplicate Within Batch',
        category: 'Groceries',
        supplier: 'Test Distributors',
        selling_price: 120,
        cost_price: 80,
      },
      {
        name: 'CSV Duplicate Within Batch',
        category: 'Groceries',
        supplier: 'Test Distributors',
        selling_price: 120,
        cost_price: 80,
      },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].row).toBe(2);

    expect(await models.Product.countDocuments({ name: 'CSV Duplicate Within Batch' })).toBe(1);
  });
});

// ─── Returns to supplier ──────────────────────────────────────────────────────

describe('Returns to supplier', () => {
  let returnProductId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Returned Yoghurt 400g',
        sellingPrice: 250,
        costPrice: 180,
        category: 'Groceries',
        supplierId,
      });
    expect(res.status).toBe(201);
    returnProductId = res.body.data._id;

    const grn = await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId: returnProductId, quantityReceived: 20, costPrice: 180 }] });
    expect(grn.status).toBe(201);
  });

  const sendBack = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/stocks/returns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ items: [{ productId: returnProductId, quantity: 2, reason: 'expired' }], ...body });

  it('refuses stock returned to nobody', async () => {
    // Stock goes back to whoever delivered it. Without a supplier the return is
    // paperwork no one can be billed for, so it must not be accepted.
    const res = await sendBack({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });

  it('refuses a supplier the suppliers page does not know', async () => {
    const res = await sendBack({ supplier: 'Unlisted Traders' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supplier/i);
  });

  it('leaves stock untouched when the supplier is missing', async () => {
    const before = (await models.Product.findById(returnProductId))!.stock;
    await sendBack({});
    const after = (await models.Product.findById(returnProductId))!.stock;
    expect(after).toBe(before);
  });

  it('links the return to the supplier the stock goes back to', async () => {
    const res = await sendBack({ supplierId });
    expect(res.status).toBe(201);
    expect(String(res.body.data.supplierId)).toBe(supplierId);
    expect(res.body.data.supplier).toBe('Test Distributors');
  });

  it('names the supplier on the Stock Out movement it leaves behind', async () => {
    const res = await sendBack({ supplierId });
    expect(res.status).toBe(201);

    const movements = await models.StockHistory.find({ product: returnProductId, type: 'remove' });
    const fromThisReturn = movements.filter((m) => m.reason.includes(res.body.data.returnNumber));
    expect(fromThisReturn).toHaveLength(1);
    expect(fromThisReturn[0].reason).toContain('Test Distributors');
  });
});

// ─── Dashboard sales figure ───────────────────────────────────────────────────
//
// Sales is revenue from what customers bought — quantity x selling price —
// never profit, and never adjusted by anything that happens on the supplier
// side. These guard the two ways that boundary was crossed before.

describe('Dashboard sales figure', () => {
  const todaySales = async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    return res.body.todaySales as number;
  };

  it('is not reduced by a supplier return recorded the same day', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Dashboard Return Test Item',
        sellingPrice: 300,
        costPrice: 200,
        category: 'Groceries',
        supplierId,
      });
    const productId = res.body.data._id;

    await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId, quantityReceived: 10, costPrice: 200 }] });

    const before = await todaySales();

    await request(app)
      .post('/api/stocks/returns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId, quantity: 5, reason: 'expired' }] });

    expect(await todaySales()).toBe(before);
  });

  it('does not count a cancelled online order even when it was already paid', async () => {
    const before = await todaySales();

    const conn = mongoose.connection.useDb(TENANT, { useCache: true });
    await conn.collection('orders').insertOne({
      orderId: 'ORD-DASH-CANCELLED-01',
      source: 'online',
      customerName: 'Web Shopper',
      items: [],
      subtotal: 5000,
      total: 5000,
      status: 'cancelled',
      orderStatus: 'cancelled',
      paymentMethod: 'payhere',
      paymentStatus: 'paid',
      storeId: 'STORE-TEST-001',
      createdBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(await todaySales()).toBe(before);
  });

  it('the Sales Summary report is not reduced by a supplier return either', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sales Report Return Test Item',
        sellingPrice: 300,
        costPrice: 200,
        category: 'Groceries',
        supplierId,
      });
    const productId = res.body.data._id;

    await request(app)
      .post('/api/stocks/grns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId, quantityReceived: 10, costPrice: 200 }] });

    const netSalesFor = async () => {
      const r = await request(app)
        .get('/api/reports/sales-summary')
        .query({ preset: 'today' })
        .set('OneShop-Tenant-ID', TENANT)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(r.status).toBe(200);
      return r.body.summary.netSales as number;
    };

    const before = await netSalesFor();

    await request(app)
      .post('/api/stocks/returns')
      .set('OneShop-Tenant-ID', TENANT)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ supplierId, items: [{ productId, quantity: 5, reason: 'expired' }] });

    expect(await netSalesFor()).toBe(before);
  });
});
