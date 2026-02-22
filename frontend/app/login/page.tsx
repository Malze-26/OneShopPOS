'use client';

import { useState } from 'react';
import { Package, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Invalid email or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-white rounded-xl p-8 shadow-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#155dfc] rounded-xl flex items-center justify-center shadow-md">
            <Package className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-[#101828] mb-2">Welcome Back</h1>
          <p className="text-sm text-[#4a5565]">Sign in to your store dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg text-sm text-[#f04438]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#101828] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@store.com"
                className="w-full pl-10 pr-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent transition-all"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#101828] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent transition-all"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5565] hover:text-[#101828] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <a href="#" className="text-sm text-[#155dfc] hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#155dfc] hover:bg-[#0d4dd9] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#4a5565]">
            OneShop POS • Inventory Management System
          </p>
        </div>
      </div>
    </div>
  );
}
