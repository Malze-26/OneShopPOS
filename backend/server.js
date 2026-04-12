const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Mock database (in production, use MongoDB or MySQL)
const users = [
  {
    id: 1,
    email: 'superadmin@oneshop.lk',
    password: '$2b$10$YourHashedPasswordHere', // SuperAdmin@123
    name: 'Platform Administrator',
    role: 'superadmin',
  },
  {
    id: 2,
    email: 'admin@fashion.com',
    password: '$2b$10$YourHashedPasswordHere', // Admin@123
    name: 'Fashion Store Admin',
    role: 'admin',
    tenantId: 'tenant_001',
  },
];

// Hash passwords (run this once to generate hashed passwords)
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hashed password:', hash);
  return hash;
}

// Uncomment to generate hashed passwords
// hashPassword('SuperAdmin@123');
// hashPassword('Admin@123');

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // For demo, using plain text comparison
    // In production, use: const isMatch = await bcrypt.compare(password, user.password);
    const correctPasswords = {
      'superadmin@oneshop.lk': 'SuperAdmin@123',
      'admin@fashion.com': 'Admin@123',
    };

    if (password !== correctPasswords[email]) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        tenantId: user.tenantId 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      success: true,
      user: decoded 
    });

  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
});

// Add this after the login endpoint

// Logout endpoint (optional - mainly for token blacklisting)
app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // In production, you would:
    // 1. Add token to blacklist in database
    // 2. Or use Redis to store blacklisted tokens
    // 3. Or implement token refresh mechanism
    
    // For now, just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});