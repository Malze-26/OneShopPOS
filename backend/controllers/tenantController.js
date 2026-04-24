const Tenant = require('../models/Tenant');
const User = require('../models/User');

// @desc    Get all tenants
// @route   GET /api/tenants
// @access  Private (Super Admin only)
exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().populate('ownerId', 'name email');

    res.json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single tenant
// @route   GET /api/tenants/:id
// @access  Private
exports.getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('ownerId', 'name email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      tenant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new tenant
// @route   POST /api/tenants
// @access  Private (Super Admin only)
exports.createTenant = async (req, res) => {
  try {
    const {
      businessName,
      businessAddress,
      phoneNumber,
      email,
      logo,
      primaryColor,
      subscription,
      status,
    } = req.body;

    // Check if tenant exists
    const tenantExists = await Tenant.findOne({ email });
    if (tenantExists) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this email already exists',
      });
    }

    // Create tenant
    const tenant = await Tenant.create({
      businessName,
      businessAddress,
      phoneNumber,
      email,
      logo,
      primaryColor,
      subscription,
      status,
      ownerId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update tenant
// @route   PUT /api/tenants/:id
// @access  Private (Super Admin only)
exports.updateTenant = async (req, res) => {
  try {
    let tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete tenant
// @route   DELETE /api/tenants/:id
// @access  Private (Super Admin only)
exports.deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    await tenant.deleteOne();

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get tenant analytics
// @route   GET /api/tenants/analytics
// @access  Private (Super Admin only)
exports.getAnalytics = async (req, res) => {
  try {
    // Total tenants
    const totalTenants = await Tenant.countDocuments();

    // Active tenants
    const activeTenants = await Tenant.countDocuments({ status: 'active' });

    // Inactive tenants
    const inactiveTenants = await Tenant.countDocuments({ status: 'inactive' });

    // Suspended tenants
    const suspendedTenants = await Tenant.countDocuments({ status: 'suspended' });

    // Tenants by subscription plan
    const subscriptionDistribution = await Tenant.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent tenants (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTenants = await Tenant.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Monthly growth — last 12 months
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

    // Build a full 12-month array (fill 0 for months with no registrations)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = monthlyGrowthRaw.find(r => r._id.year === y && r._id.month === m);
      monthlyGrowth.push({ label: monthNames[m - 1], count: found ? found.count : 0 });
    }

    // All tenants for performance table (name, status, plan, email, createdAt)
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
      error: error.message,
    });
  }
};