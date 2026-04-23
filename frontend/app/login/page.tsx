'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useStore } from '@/app/contexts/StoreContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { storeName } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot reach server. Please check backend is running and API URL is correct.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-[#eff4ff] rounded-xl flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" fill="#155dfc" />
              <rect x="14" y="3" width="7" height="7" rx="1" fill="#155dfc" />
              <rect x="3" y="14" width="7" height="7" rx="1" fill="#155dfc" />
              <rect x="14" y="14" width="7" height="7" rx="1" fill="#155dfc" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#101828]">{storeName}</h1>
          <p className="text-sm text-[#4a5565]">Store Management</p>
        </div>

        <h2 className="text-lg font-semibold text-[#101828] mb-1">Sign in</h2>
        <p className="text-sm text-[#4a5565] mb-6">Enter your credentials to continue.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
              placeholder="admin@oneshop.lk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="rememberMe" className="text-sm text-[#4a5565]">Remember me</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#155dfc] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#1249d6] transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
