/**
 * Tests for the Tenant Controller.
 * Tests the business logic of createTenant and deleteTenant.
 * All DB calls are mocked — no real database is used.
 */

// Mock Tenant model
jest.mock('../src/models/Tenant', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
}));

// Mock provisionTenantDatabase so no real DB connection is made
jest.mock('../src/utils/tenantProvisioner', () => ({
  provisionTenantDatabase: jest.fn().mockResolvedValue('oneshop_test_shop'),
  dropTenantDatabase: jest.fn().mockResolvedValue(undefined),
  getTenantDbUri: jest.fn().mockReturnValue('mongodb://localhost/test'),
  setManagerInTenantDb: jest.fn().mockResolvedValue(undefined),
  getManagerFromTenantDb: jest.fn().mockResolvedValue({ name: 'Test Manager', email: 'manager@test.com' }),
  syncPlanToTenantDb: jest.fn().mockResolvedValue(undefined),
}));

// Mock notification so it doesn't interfere
jest.mock('../src/controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('mongoose', () => ({ createConnection: jest.fn() }));
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'test_secret';

import { createTenant, deleteTenant, getAllTenants, getAnalytics } from '../src/controllers/tenantController';
import Tenant from '../src/models/Tenant';
import { Request, Response } from 'express';

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── createTenant ─────────────────────────────────────────────────────────────

describe('createTenant', () => {

  beforeEach(() => jest.clearAllMocks());

  test('rejects if a tenant with the same email already exists', async () => {
    (Tenant.findOne as jest.Mock).mockResolvedValue({ email: 'taken@shop.com' });

    const req = {
      body: { businessName: 'New Shop', email: 'taken@shop.com' },
      user: { id: 'admin1' },
    } as any;
    const res = mockRes();

    await createTenant(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.message).toMatch(/already exists/i);
  });

  test('creates tenant and provisions database when email is unique', async () => {
    (Tenant.findOne as jest.Mock).mockResolvedValue(null); // no duplicate

    const fakeTenant = {
      _id: 'tenant123',
      businessName: 'Test Shop',
      email: 'test@shop.com',
      databaseName: null,
      save: jest.fn().mockResolvedValue(true),
    };
    (Tenant.create as jest.Mock).mockResolvedValue(fakeTenant);

    const req = {
      body: {
        businessName: 'Test Shop',
        businessAddress: '123 Main St',
        phoneNumber: '+94771234567',
        email: 'test@shop.com',
        subscription: { plan: 'basic' },
      },
      user: { id: 'admin1' },
    } as any;
    const res = mockRes();

    await createTenant(req as Request, res as Response);

    expect(Tenant.create).toHaveBeenCalled();

    // Database name should be saved on the tenant
    expect(fakeTenant.databaseName).toBe('oneshop_test_shop');
    expect(fakeTenant.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
  });

  test('returns 500 and rolls back if database provisioning fails', async () => {
    (Tenant.findOne as jest.Mock).mockResolvedValue(null);

    const fakeTenant = {
      _id: 'tenant123',
      businessName: 'Failing Shop',
      email: 'fail@shop.com',
      save: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue(true), // rollback
    };
    (Tenant.create as jest.Mock).mockResolvedValue(fakeTenant);

    // Make provisioning throw an error
    const { provisionTenantDatabase } = require('../src/utils/tenantProvisioner');
    (provisionTenantDatabase as jest.Mock).mockRejectedValueOnce(new Error('Atlas connection failed'));

    const req = {
      body: { businessName: 'Failing Shop', email: 'fail@shop.com' },
      user: { id: 'admin1' },
    } as any;
    const res = mockRes();

    await createTenant(req as Request, res as Response);

    // Tenant record should be deleted (rollback)
    expect(fakeTenant.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

});

// ─── deleteTenant ─────────────────────────────────────────────────────────────

describe('deleteTenant', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns 404 if tenant does not exist', async () => {
    (Tenant.findById as jest.Mock).mockResolvedValue(null);

    const req = { params: { id: 'nonexistent' } } as any;
    const res = mockRes();

    await deleteTenant(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deletes tenant record and drops its database', async () => {
    const fakeTenant = {
      _id: 'tenant123',
      businessName: 'Test Shop',
      databaseName: 'oneshop_test_shop',
      deleteOne: jest.fn().mockResolvedValue(true),
    };
    (Tenant.findById as jest.Mock).mockResolvedValue(fakeTenant);

    const { dropTenantDatabase } = require('../src/utils/tenantProvisioner');

    const req = { params: { id: 'tenant123' } } as any;
    const res = mockRes();

    await deleteTenant(req as Request, res as Response);

    expect(fakeTenant.deleteOne).toHaveBeenCalled();       // record deleted
    expect(dropTenantDatabase).toHaveBeenCalledWith('oneshop_test_shop'); // DB dropped

    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
  });

  test('still deletes tenant record even if dropping the database fails', async () => {
    const fakeTenant = {
      _id: 'tenant123',
      businessName: 'Test Shop',
      databaseName: 'oneshop_test_shop',
      deleteOne: jest.fn().mockResolvedValue(true),
    };
    (Tenant.findById as jest.Mock).mockResolvedValue(fakeTenant);

    const { dropTenantDatabase } = require('../src/utils/tenantProvisioner');
    (dropTenantDatabase as jest.Mock).mockRejectedValueOnce(new Error('Cannot drop'));

    const req = { params: { id: 'tenant123' } } as any;
    const res = mockRes();

    await deleteTenant(req as Request, res as Response);

    // Should still respond with success — DB drop failure is non-critical
    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
  });

});

// ─── getAllTenants ────────────────────────────────────────────────────────────

describe('getAllTenants', () => {
  beforeEach(() => jest.clearAllMocks());

  test('fetches tenants, runs syncTenantStatus, and saves changed tenants', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredTenant = {
      _id: 't1',
      businessName: 'Expired Shop',
      status: 'active',
      subscription: { plan: 'basic', status: 'active', endDate: pastDate },
      save: jest.fn().mockResolvedValue(true),
    };
    const activeTenant = {
      _id: 't2',
      businessName: 'Active Shop',
      status: 'active',
      subscription: { plan: 'basic', status: 'active' },
      save: jest.fn().mockResolvedValue(true),
    };

    const mockPopulate = jest.fn().mockResolvedValue([expiredTenant, activeTenant]);
    (Tenant.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

    const req = {} as Request;
    const res = mockRes();

    await getAllTenants(req, res as Response);

    expect(expiredTenant.status).toBe('inactive');
    expect(expiredTenant.subscription.status).toBe('inactive');
    expect(expiredTenant.save).toHaveBeenCalled();

    expect(activeTenant.status).toBe('active');
    expect(activeTenant.save).not.toHaveBeenCalled();

    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.count).toBe(2);
  });
});

// ─── getAnalytics ─────────────────────────────────────────────────────────────

describe('getAnalytics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('syncs tenant statuses before counting/aggregating', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredTenant = {
      _id: 't1',
      status: 'active',
      subscription: { plan: 'basic', status: 'active', endDate: pastDate },
      save: jest.fn().mockResolvedValue(true),
    };

    // First find() in getAnalytics syncs statuses
    const mockSort = jest.fn().mockResolvedValue([expiredTenant]);
    (Tenant.find as jest.Mock)
      .mockResolvedValueOnce([expiredTenant]) // for status sync
      .mockReturnValueOnce({ sort: mockSort }); // for tenantList query

    (Tenant.countDocuments as jest.Mock).mockResolvedValue(1);
    (Tenant.aggregate as jest.Mock).mockResolvedValue([]);

    const req = {} as Request;
    const res = mockRes();

    await getAnalytics(req, res as Response);

    expect(expiredTenant.save).toHaveBeenCalled();
    expect(expiredTenant.status).toBe('inactive');
    expect(Tenant.countDocuments).toHaveBeenCalled();
  });
});

