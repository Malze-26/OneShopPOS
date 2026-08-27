/**
 * Tests for tenantProvisioner utility functions.
 * These are UNIT TESTS — they test pure logic with no database needed.
 */

// We need to mock mongoose so no real DB connection is made
jest.mock('mongoose', () => ({
  createConnection: jest.fn().mockReturnValue({
    asPromise: jest.fn().mockResolvedValue({
      db: {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
          insertOne: jest.fn().mockResolvedValue({}),
          updateOne: jest.fn().mockResolvedValue({}),
        }),
        createCollection: jest.fn().mockResolvedValue({}),
        dropDatabase: jest.fn().mockResolvedValue({}),
      },
      close: jest.fn().mockResolvedValue({}),
    }),
  }),
}));

// Mock bcryptjs so we don't do real hashing in tests (slow)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123'),
}));

// Set fake environment variable before importing the module
process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/super_user?retryWrites=true';

import { getTenantDbUri, getMaxProductsForPlan, PLAN_MAX_PRODUCTS } from '../src/utils/tenantProvisioner';

// ─── getTenantDbUri ───────────────────────────────────────────────────────────

describe('getTenantDbUri', () => {

  test('replaces the database name in the URI', () => {
    const result = getTenantDbUri('oneshop_fashion_hub');
    // The function should swap "super_user" with "oneshop_fashion_hub"
    expect(result).toContain('oneshop_fashion_hub');
    expect(result).not.toContain('super_user');
  });

  test('preserves the rest of the URI (host, credentials, query params)', () => {
    const result = getTenantDbUri('oneshop_tech_store');
    expect(result).toContain('cluster.mongodb.net');
    expect(result).toContain('retryWrites=true');
  });

  test('works for any database name passed in', () => {
    const uri1 = getTenantDbUri('oneshop_book_mart');
    const uri2 = getTenantDbUri('oneshop_open_door');
    // Each call should produce a different URI
    expect(uri1).not.toEqual(uri2);
    expect(uri1).toContain('oneshop_book_mart');
    expect(uri2).toContain('oneshop_open_door');
  });

});

// ─── getMaxProductsForPlan ───────────────────────────────────────────────────

describe('getMaxProductsForPlan & PLAN_MAX_PRODUCTS', () => {

  test('basic plan has a limit of 100 products', () => {
    expect(PLAN_MAX_PRODUCTS.basic).toBe(100);
    expect(getMaxProductsForPlan('basic')).toBe(100);
  });

  test('premium plan has null (unlimited) max products', () => {
    expect(PLAN_MAX_PRODUCTS.premium).toBeNull();
    expect(getMaxProductsForPlan('premium')).toBeNull();
  });

  test('unknown or undefined plan defaults to 100', () => {
    expect(getMaxProductsForPlan(undefined)).toBe(100);
    expect(getMaxProductsForPlan('unknown_plan')).toBe(100);
  });

});

