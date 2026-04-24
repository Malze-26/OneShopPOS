import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const tenantReadSchema = new mongoose.Schema(
  {
    businessName:    String,
    logo:            String,
    backgroundImage: String,
    primaryColor:    String,
    databaseName:    String,
    status:          String,
  },
  { collection: 'tenants' }
);

const router = Router();

/**
 * GET /api/tenants/public
 * Public endpoint — no auth or tenant header required.
 * Returns all active tenants so the login page can populate the store dropdown.
 */
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const factoryDbName = process.env.TENANT_FACTORY_DB || 'oneshop-tenant-factory';
    const factoryConn = mongoose.connection.useDb(factoryDbName, { useCache: true });

    const TenantModel =
      factoryConn.models['Tenant'] ||
      factoryConn.model('Tenant', tenantReadSchema);

    const tenants = await TenantModel.find({ status: 'active' })
      .select('businessName logo backgroundImage primaryColor databaseName')
      .lean();

    res.json({ data: tenants });
  } catch (err) {
    console.error('[Tenants] Error fetching tenants:', err);
    res.status(500).json({ message: 'Failed to fetch tenants' });
  }
});

export default router;
