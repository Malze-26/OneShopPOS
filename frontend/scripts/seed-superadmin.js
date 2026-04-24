// scripts/seed-superadmin.js
// This script creates the initial Super Admin account

const bcrypt = require('bcrypt');

/**
 * Seed Super Admin Account
 * 
 * This creates a Super Admin account in the database.
 * Run this script once during initial setup.
 * 
 * Usage: node scripts/seed-superadmin.js
 */

async function seedSuperAdmin() {
  try {
    // TODO: Replace with your actual database connection
    // const db = await connectToDatabase();
    
    const superAdminData = {
      email: 'superadmin@oneshop.lk',
      password: await bcrypt.hash('SuperAdmin@123', 10), // Hash the password
      name: 'Platform Administrator',
      role: 'superadmin',
      createdAt: new Date(),
      isVerified: true,
      isActive: true,
    };

    console.log('Creating Super Admin account...');
    
    // TODO: Replace with your actual database insert
    // await db.collection('users').insertOne(superAdminData);
    
    console.log('✅ Super Admin account created successfully!');
    console.log('📧 Email:', superAdminData.email);
    console.log('🔑 Password: SuperAdmin@123');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    
    // Close database connection
    // await db.close();
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin();

/**
 * ALTERNATIVE: Add to package.json scripts
 * 
 * "scripts": {
 *   "seed:superadmin": "node scripts/seed-superadmin.js"
 * }
 * 
 * Then run: npm run seed:superadmin
 */