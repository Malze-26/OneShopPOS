import { syncTenantStatus } from '../src/utils/tenantStatusChecker';

describe('tenantStatusChecker - syncTenantStatus', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in future

  describe('Rule 1: ACTIVE (default)', () => {
    test('active tenant with no endDate stays active and returns false', () => {
      const tenant: any = {
        status: 'active',
        subscription: {
          plan: 'basic',
          status: 'active',
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('active');
      expect(tenant.subscription.status).toBe('active');
    });

    test('active tenant with future endDate stays active and returns false', () => {
      const tenant: any = {
        status: 'active',
        subscription: {
          plan: 'premium',
          status: 'active',
          endDate: futureDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('active');
      expect(tenant.subscription.status).toBe('active');
    });
  });

  describe('Rule 2: AUTO → INACTIVE', () => {
    test('active tenant with past endDate is set to inactive and returns true', () => {
      const tenant: any = {
        status: 'active',
        subscription: {
          plan: 'basic',
          status: 'active',
          endDate: pastDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(true);
      expect(tenant.status).toBe('inactive');
      expect(tenant.subscription.status).toBe('inactive');
    });

    test('inactive tenant with past endDate is already inactive and returns false', () => {
      const tenant: any = {
        status: 'inactive',
        subscription: {
          plan: 'basic',
          status: 'inactive',
          endDate: pastDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('inactive');
      expect(tenant.subscription.status).toBe('inactive');
    });
  });

  describe('Rule 3: AUTO → ACTIVE (reactivation)', () => {
    test('inactive tenant with renewed future endDate is reactivated and returns true', () => {
      const tenant: any = {
        status: 'inactive',
        subscription: {
          plan: 'premium',
          status: 'inactive',
          endDate: futureDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(true);
      expect(tenant.status).toBe('active');
      expect(tenant.subscription.status).toBe('active');
    });
  });

  describe('Rule 4: SUSPENDED is NEVER touched automatically', () => {
    test('suspended tenant with past endDate is NOT changed and returns false', () => {
      const tenant: any = {
        status: 'suspended',
        subscription: {
          plan: 'basic',
          status: 'suspended',
          endDate: pastDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('suspended');
      expect(tenant.subscription.status).toBe('suspended');
    });

    test('suspended tenant with future endDate is NOT changed and returns false', () => {
      const tenant: any = {
        status: 'suspended',
        subscription: {
          plan: 'basic',
          status: 'suspended',
          endDate: futureDate,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('suspended');
      expect(tenant.subscription.status).toBe('suspended');
    });
  });

  describe('Edge Cases', () => {
    test('null or undefined tenant returns false', () => {
      expect(syncTenantStatus(null as any)).toBe(false);
      expect(syncTenantStatus(undefined as any)).toBe(false);
    });

    test('tenant with missing subscription object handles gracefully', () => {
      const tenant: any = {
        status: 'active',
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('active');
    });

    test('inactive tenant with no endDate stays inactive and returns false', () => {
      const tenant: any = {
        status: 'inactive',
        subscription: {
          plan: 'basic',
          status: 'inactive',
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('inactive');
      expect(tenant.subscription.status).toBe('inactive');
    });

    test('tenant with invalid date string does not throw and returns false', () => {
      const tenant: any = {
        status: 'active',
        subscription: {
          plan: 'basic',
          status: 'active',
          endDate: 'not-a-date' as any,
        },
      };

      const changed = syncTenantStatus(tenant);

      expect(changed).toBe(false);
      expect(tenant.status).toBe('active');
    });
  });
});
