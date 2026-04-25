'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

type Role = 'Manager' | 'Cashier' | null;

interface Tenant {
  _id: string;
  businessName: string;
  logo: string | null;
  backgroundImage: string | null;
  primaryColor: string;
  databaseName: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace('/api', '');

export default function LoginPage() {
  const { login } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantOpen, setTenantOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Load tenant list on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/tenants/public`)
      .then(r => r.json())
      .then(({ data }: { data: Tenant[] }) => {
        setTenants(data ?? []);
        // Auto-select the last used tenant from localStorage
        const saved = localStorage.getItem('tenantId');
        if (saved) {
          const match = data?.find((t) => t.databaseName === saved);
          if (match) applyTenant(match);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Apply tenant branding ────────────────────────────────────────────────
  function applyTenant(tenant: Tenant) {
    setSelectedTenant(tenant);
    localStorage.setItem('tenantId', tenant.databaseName);
    document.documentElement.style.setProperty('--color-primary', tenant.primaryColor);
  }

  const handleSelectTenant = (tenant: Tenant) => {
    applyTenant(tenant);
    setTenantOpen(false);
    // Reset flow when tenant changes
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe, selectedRole!);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const logoSrc = selectedTenant?.logo
    ? (selectedTenant.logo.startsWith('http') ? selectedTenant.logo : `${API_BASE}${selectedTenant.logo}`)
    : null;

  const bgStyle = selectedTenant?.backgroundImage
    ? {
        backgroundImage: `url(${selectedTenant.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: '#f9fafb' };

  const primaryColor = selectedTenant?.primaryColor ?? '#155dfc';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 transition-all duration-500" style={bgStyle}>
      {/* Dark overlay for background images */}
      {selectedTenant?.backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      <div className="w-full max-w-sm relative z-10">

        {/* Logo + Store name / Tenant selector */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-3"
            style={{ background: logoSrc ? 'white' : '#eff4ff', border: logoSrc ? '1px solid #e4e7ec' : 'none' }}
          >
            {logoSrc
              ? <img src={logoSrc} alt={selectedTenant?.businessName} className="w-full h-full object-contain" />
              : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" fill={primaryColor} />
                  <rect x="14" y="3" width="7" height="7" rx="1" fill={primaryColor} />
                  <rect x="3" y="14" width="7" height="7" rx="1" fill={primaryColor} />
                  <rect x="14" y="14" width="7" height="7" rx="1" fill={primaryColor} />
                </svg>
              )
            }
          </div>

          {/* Tenant dropdown */}
          <div className="relative mb-1">
            <button
              type="button"
              onClick={() => setTenantOpen((o) => !o)}
              className="flex items-center gap-2 text-xl font-bold px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
              style={{ color: selectedTenant?.backgroundImage ? 'white' : '#101828' }}
            >
              {selectedTenant?.businessName ?? 'Select Store'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {tenantOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl border border-[#e4e7ec] min-w-[220px] overflow-hidden z-50">
                {tenants.length === 0 && (
                  <p className="px-4 py-3 text-sm text-[#4a5565]">No stores available</p>
                )}
                {tenants.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => handleSelectTenant(t)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f5f8ff] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: t.logo ? 'white' : t.primaryColor + '20', border: '1px solid #e4e7ec' }}
                    >
                      {t.logo
                        ? <img
                            src={t.logo.startsWith('http') ? t.logo : `${API_BASE}${t.logo}`}
                            alt={t.businessName}
                            className="w-full h-full object-contain"
                          />
                        : <span className="text-xs font-bold" style={{ color: t.primaryColor }}>
                            {t.businessName.slice(0, 2).toUpperCase()}
                          </span>
                      }
                    </div>
                    <span className="text-sm font-medium text-[#101828]">{t.businessName}</span>
                    {selectedTenant?._id === t._id && (
                      <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={t.primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm" style={{ color: selectedTenant?.backgroundImage ? 'rgba(255,255,255,0.8)' : '#4a5565' }}>
            Store Management
          </p>
        </div>

        {/* Card — only shown once a tenant is selected */}
        {!selectedTenant ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-sm text-[#4a5565]">Please select a store above to continue</p>
          </div>
        ) : (
          <>
            {/* Role Selector */}
            {!selectedRole && (
              <div className="bg-white rounded-2xl shadow-md p-8">
                <h2 className="text-lg font-semibold text-[#101828] mb-1 text-center">Welcome</h2>
                <p className="text-sm text-[#4a5565] mb-6 text-center">Select your role to continue</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Manager */}
                  <button
                    onClick={() => setSelectedRole('Manager')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#e4e7ec] hover:bg-[#f5f8ff] transition-all group"
                    style={{ '--hover-border': primaryColor } as React.CSSProperties}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = primaryColor)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e4e7ec')}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: primaryColor + '18' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        <line x1="12" y1="12" x2="12" y2="16" />
                        <line x1="10" y1="14" x2="14" y2="14" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#101828]">Manager</p>
                      <p className="text-xs text-[#4a5565] mt-0.5">Dashboard &amp; Inventory</p>
                    </div>
                  </button>

                  {/* Cashier */}
                  <button
                    onClick={() => setSelectedRole('Cashier')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[#e4e7ec] hover:bg-[#f5f8ff] transition-all group"
                    onMouseEnter={e => (e.currentTarget.style.borderColor = primaryColor)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e4e7ec')}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: primaryColor + '18' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8" />
                        <path d="M12 17v4" />
                        <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#101828]">Cashier</p>
                      <p className="text-xs text-[#4a5565] mt-0.5">POS &amp; Sales Staff</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Login Form */}
            {selectedRole && (
              <div className="bg-white rounded-2xl shadow-md p-8">
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={handleBack}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e4e7ec] hover:bg-[#f5f8ff] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4a5565]">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-base font-semibold text-[#101828]">
                      {selectedRole === 'Manager' ? 'Manager Sign In' : 'Cashier Sign In'}
                    </h2>
                    <p className="text-xs text-[#4a5565]">
                      {selectedRole === 'Manager' ? 'Dashboard & Inventory access' : 'Point of Sale access'}
                    </p>
                  </div>
                  <span
                    className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: primaryColor + '20', color: primaryColor }}
                  >
                    {selectedRole}
                  </span>
                </div>

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
                      autoFocus
                      className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                      placeholder={selectedRole === 'Manager' ? 'manager@store.com' : 'cashier@store.com'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#101828] mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5565] hover:text-[#101828]"
                      >
                        {showPassword ? (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                    className="w-full text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                    style={{ background: primaryColor }}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
