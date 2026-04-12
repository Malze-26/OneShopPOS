'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Mock user credentials (for demo - will use backend API)
  const mockUsers = {
    'superadmin@oneshop.lk': {
      password: 'SuperAdmin@123',
      role: 'superadmin',
      name: 'Platform Administrator'
    },
    'admin@fashion.com': {
      password: 'Admin@123',
      role: 'admin',
      name: 'Fashion Store Admin'
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Option 1: Using mock data (for demo without backend)
    setTimeout(() => {
      const user = mockUsers[email];

      if (!user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        email: email,
        name: user.name,
        role: user.role
      }));

      // Redirect based on role
      if (user.role === 'superadmin') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/tenant/dashboard');
      }

      setLoading(false);
    }, 1000);

    /* Option 2: Using backend API (uncomment when backend is ready)
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'superadmin') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/tenant/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
    */
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" 
            style={{ backgroundColor: '#151194' }}
          >
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin}>
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none transition text-black placeholder-gray-400"
                  style={{ 
                    color: '#000000',
                    focusRingColor: '#151194' 
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none transition text-black placeholder-gray-400"
                  style={{ 
                    color: '#000000',
                    focusRingColor: '#151194' 
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded focus:ring-2 cursor-pointer"
                  style={{ accentColor: '#151194' }}
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="#" 
                className="text-sm font-medium hover:opacity-80 transition"
                style={{ color: '#151194' }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#151194' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Note:</strong> The system will automatically redirect you to the appropriate dashboard based on your account type.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Having trouble?{' '}
            <a 
              href="#" 
              className="font-medium hover:opacity-80 transition"
              style={{ color: '#151194' }}
            >
              Contact Support
            </a>
          </p>
        </div>

        {/* Demo Credentials (Remove this in production) */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg text-white text-xs">
          <p className="font-semibold mb-2">🔑 Demo Credentials:</p>
          <div className="space-y-1 font-mono">
            <p>Super Admin: superadmin@oneshop.lk / SuperAdmin@123</p>
            <p>Tenant Admin: admin@fashion.com / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}