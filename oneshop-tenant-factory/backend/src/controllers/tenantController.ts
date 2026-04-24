import { Request, Response } from 'express';
import Tenant from '../models/Tenant';
import { provisionTenantDatabase, dropTenantDatabase } from '../utils/tenantProvisioner';

export const getAllTenants = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await Tenant.find().populate('ownerId', 'name email');
    res.json({ success: true, count: tenants.length, tenants });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('ownerId', 'name email');

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    res.json({ success: true, tenant });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};

export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessName, businessAddress, phoneNumber, email, logo, primaryColor, subscription, status } =
      req.body as {
        businessName: string;
        businessAddress: string;
        phoneNumber: string;
        email: string;
        logo?: string;
        primaryColor?: string;
        subscription?: object;
        status?: string;
      };

    const tenantExists = await Tenant.findOne({ email });
    if (tenantExists) {
      res.status(400).json({
        success: false,
        message: 'Tenant with this email already exists',
      });
      return;
    }

    const tenant = await Tenant.create({
      businessName,
      businessAddress,
      phoneNumber,
      email,
      logo,
      primaryColor,
      subscription,
      status,
      ownerId: req.user!.id,
    });

    try {
      const dbName = await provisionTenantDatabase(tenant);
      tenant.databaseName = dbName;
      await tenant.save();
    } catch (provisionErr) {
      await tenant.deleteOne();
      res.status(500).json({
        success: false,
        message: 'Failed to provision tenant database',
        error: (provisionErr as Error).message,
      });
      return;
    }

    res.status(201).json({ success: true, message: 'Tenant created successfully', tenant });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};

export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    let tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Tenant updated successfully', tenant });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    const dbName = tenant.databaseName;
    await tenant.deleteOne();

    if (dbName) {
      try {
        await dropTenantDatabase(dbName);
      } catch (dropErr) {
        console.error(`Warning: could not drop database ${dbName}:`, (dropErr as Error).message);
      }
    }

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};

export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const inactiveTenants = await Tenant.countDocuments({ status: 'inactive' });
    const suspendedTenants = await Tenant.countDocuments({ status: 'suspended' });

    const subscriptionDistribution = await Tenant.aggregate([
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTenants = await Tenant.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyGrowthRaw = await Tenant.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = monthlyGrowthRaw.find((r) => r._id.year === y && r._id.month === m);
      monthlyGrowth.push({ label: monthNames[m - 1], count: found ? found.count : 0 });
    }

    const tenantList = await Tenant.find(
      {},
      { businessName: 1, status: 1, subscription: 1, email: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ createdAt: -1 });

    res.json({
      success: true,
      analytics: {
        totalTenants,
        activeTenants,
        inactiveTenants,
        suspendedTenants,
        recentTenants,
        subscriptionDistribution,
        monthlyGrowth,
        tenantList,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message,
    });
  }
};
