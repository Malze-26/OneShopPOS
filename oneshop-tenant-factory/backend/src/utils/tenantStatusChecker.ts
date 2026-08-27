import { HydratedDocument } from 'mongoose';
import { ITenant } from '../models/Tenant';

/**
 * Synchronizes tenant status and subscription status based on subscription endDate.
 *
 * Business Rules:
 * 1. ACTIVE (default): Tenant stays active as long as subscription.endDate is either not set,
 *    or is in the future, and the tenant was not manually suspended.
 * 2. AUTO → INACTIVE: If subscription.endDate exists and has passed (is in the past), and
 *    the tenant's current status is NOT 'suspended', set tenant.status = 'inactive' and
 *    subscription.status = 'inactive'.
 * 3. AUTO → ACTIVE (reactivation): If a tenant's status is currently 'inactive' AND
 *    subscription.endDate has been updated to a future date (e.g. admin renewed/extended it),
 *    set tenant.status = 'active' and subscription.status = 'active' automatically.
 * 4. SUSPENDED is NEVER touched automatically in either direction. Skip suspended tenants
 *    entirely in the status checker.
 *
 * Mutates the document in memory without calling .save().
 *
 * @param tenant - Mongoose tenant document (HydratedDocument<ITenant> | ITenant)
 * @returns boolean - true if the document was modified in memory, false otherwise
 */
export const syncTenantStatus = (tenant: HydratedDocument<ITenant> | ITenant): boolean => {
  if (!tenant) {
    return false;
  }

  // Rule 4: SUSPENDED is never touched automatically
  if (tenant.status === 'suspended') {
    return false;
  }

  const now = new Date();
  const rawEndDate = tenant.subscription?.endDate;
  const endDate = rawEndDate ? new Date(rawEndDate) : null;
  const hasValidEndDate = endDate !== null && !isNaN(endDate.getTime());

  let changed = false;

  if (hasValidEndDate && endDate < now) {
    // Rule 2: AUTO → INACTIVE
    if (tenant.status !== 'inactive') {
      tenant.status = 'inactive';
      changed = true;
    }
    if (tenant.subscription && tenant.subscription.status !== 'inactive') {
      tenant.subscription.status = 'inactive';
      changed = true;
    }
  } else if (hasValidEndDate && endDate >= now) {
    // Rule 3: AUTO → ACTIVE (Reactivation)
    if (tenant.status === 'inactive') {
      tenant.status = 'active';
      changed = true;
    }
    if (tenant.subscription && tenant.subscription.status === 'inactive') {
      tenant.subscription.status = 'active';
      changed = true;
    }
  }

  // Rule 1 & Edge Case: If tenant has no endDate or valid future date and was already active/inactive
  // without date change, no modification occurs and changed remains false.

  return changed;
};
