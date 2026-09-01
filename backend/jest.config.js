module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 10000,
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  // inventory.test.ts and tenant-isolation.test.ts each spin up their own
  // MongoMemoryServer. On a machine with no cached binary yet (a fresh CI
  // runner), running them in parallel workers races two downloads onto the
  // same lock file and one loses. Serializing test files sidesteps that.
  maxWorkers: 1,
};
