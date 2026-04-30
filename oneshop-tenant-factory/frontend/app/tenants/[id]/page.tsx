'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Edit2, Trash2, Palette, Store, DollarSign, User, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { tenantAPI } from '../../../utils/api';

interface Tenant {
  _id: string;
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  logo?: string;
  primaryColor: string;
  status: string;
  subscription: {
    plan: string;
    status: string;
    startDate?: string;
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface StoreSettings {
  storeName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  primaryColor?: string;
  currency?: string;
  taxRate?: number;
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

const planStyles: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
};

export default function ViewTenantPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [manager, setManager] = useState<{ name: string; email: string } | null>(null);
  const [managerForm, setManagerForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerSaved, setManagerSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchTenant = async () => {
      try {
        const data = await tenantAPI.getOne(id);
        if (data.success) {
          setTenant(data.tenant);
        } else {
          setError(data.message || 'Tenant not found');
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    const fetchStoreSettings = async () => {
      try {
        const data = await tenantAPI.getStoreSettings(id);
        if (data.success && data.settings) {
          setStoreSettings(data.settings);
        }
      } catch {
        // Store settings are optional — silently ignore
      } finally {
        setSettingsLoading(false);
      }
    };

    const fetchManager = async () => {
      try {
        const data = await tenantAPI.getManager(id);
        if (data.success && data.manager) {
          setManager(data.manager);
          setManagerForm((prev) => ({ ...prev, name: data.manager.name, email: data.manager.email }));
        }
      } catch {}
    };

    fetchTenant();
    fetchStoreSettings();
    fetchManager();
  }, [id]);

  const handleSaveManager = async () => {
    if (!managerForm.name || !managerForm.email || !managerForm.password) {
      alert('Name, email and password are all required.');
      return;
    }
    setManagerSaving(true);
    try {
      const data = await tenantAPI.setManager(id, managerForm);
      if (data.success) {
        setManager({ name: managerForm.name, email: managerForm.email });
        setManagerForm((prev) => ({ ...prev, password: '' }));
        setManagerSaved(true);
        setTimeout(() => setManagerSaved(false), 3000);
      } else {
        alert(data.message || 'Failed to save manager credentials');
      }
    } catch {
      alert('Error saving manager credentials');
    } finally {
      setManagerSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tenant?.businessName}"? This cannot be undone.`)) return;
    try {
      const data = await tenantAPI.delete(id);
      if (data.success) {
        router.push('/tenants');
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Error deleting tenant');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading tenant details...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !tenant) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Tenant not found'}</p>
            <button
              onClick={() => router.push('/tenants')}
              className="px-4 py-2 text-white rounded-lg"
              style={{ backgroundColor: '#151194' }}
            >
              Back to Tenants
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/tenants')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tenants
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{tenant.businessName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusStyles[tenant.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {tenant.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${planStyles[tenant.subscription?.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                {tenant.subscription?.plan || 'basic'} plan
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/tenants/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-gray-900">{tenant.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
                    <p className="text-gray-900">{tenant.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Business Address</p>
                    <p className="text-gray-900">{tenant.businessAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Registered On</p>
                    <p className="text-gray-900">
                      {new Date(tenant.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Last Updated</p>
                    <p className="text-gray-900">
                      {new Date(tenant.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Settings from tenant database */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Store className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Store Settings</h2>
                <span className="text-xs text-gray-400 ml-auto">Live from tenant database</span>
              </div>

              {settingsLoading ? (
                <p className="text-sm text-gray-400">Loading store settings...</p>
              ) : storeSettings ? (
                <div className="space-y-4">
                  {storeSettings.storeName && (
                    <div className="flex items-start gap-3">
                      <Store className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Store Name</p>
                        <p className="text-gray-900">{storeSettings.storeName}</p>
                      </div>
                    </div>
                  )}
                  {storeSettings.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Store Email</p>
                        <p className="text-gray-900">{storeSettings.email}</p>
                      </div>
                    </div>
                  )}
                  {storeSettings.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Store Phone</p>
                        <p className="text-gray-900">{storeSettings.phone}</p>
                      </div>
                    </div>
                  )}
                  {storeSettings.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Store Address</p>
                        <p className="text-gray-900">{storeSettings.address}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {storeSettings.currency && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Currency</p>
                          <p className="text-gray-900 font-mono">{storeSettings.currency}</p>
                        </div>
                      </div>
                    )}
                    {storeSettings.taxRate !== undefined && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-0.5">Tax Rate</p>
                        <p className="text-gray-900 font-semibold">{storeSettings.taxRate}%</p>
                      </div>
                    )}
                  </div>
                  {storeSettings.logoUrl && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Store Logo</p>
                      <img
                        src={storeSettings.logoUrl}
                        alt="Store logo"
                        className="max-h-20 object-contain rounded-lg border border-gray-100 p-2 bg-gray-50"
                      />
                    </div>
                  )}
                  {storeSettings.primaryColor && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Store Primary Color</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: storeSettings.primaryColor }} />
                        <span className="font-mono text-sm text-gray-700">{storeSettings.primaryColor}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No store settings found in tenant database</p>
                </div>
              )}
            </div>

            {/* Manager Credentials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Manager Account</h2>
                  {manager && <p className="text-xs text-gray-400">Current: {manager.name} · {manager.email}</p>}
                </div>
                {managerSaved && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" /> Saved
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text" value={managerForm.name}
                      onChange={(e) => setManagerForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Manager full name"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" value={managerForm.email}
                      onChange={(e) => setManagerForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="manager@store.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {manager ? 'New Password' : 'Temporary Password'}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} value={managerForm.password}
                      onChange={(e) => setManagerForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder={manager ? 'Enter new password to change' : 'Set a temporary password'}
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">The manager can change this after their first login.</p>
                </div>
                <button
                  onClick={handleSaveManager} disabled={managerSaving}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ backgroundColor: '#151194' }}
                >
                  {managerSaving ? 'Saving...' : manager ? 'Update Credentials' : 'Set Credentials'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Subscription</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Plan</p>
                  <p className="font-semibold text-gray-900 capitalize">{tenant.subscription?.plan || 'Basic'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{tenant.subscription?.status || 'Active'}</p>
                </div>
                {tenant.subscription?.startDate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="font-semibold text-gray-900">{new Date(tenant.subscription.startDate).toLocaleDateString()}</p>
                  </div>
                )}
                {tenant.subscription?.endDate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="font-semibold text-gray-900">{new Date(tenant.subscription.endDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
              </div>

              {tenant.logo ? (
                <img
                  src={tenant.logo} alt={`${tenant.businessName} logo`}
                  className="w-full max-h-32 object-contain mb-4 rounded-lg border border-gray-100 p-2"
                />
              ) : (
                <div className="w-full h-24 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center mb-4">
                  <p className="text-sm text-gray-400">No logo uploaded</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-2">Primary Color</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: tenant.primaryColor }} />
                  <span className="font-mono text-sm text-gray-700">{tenant.primaryColor}</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <button className="w-full py-2 text-white text-sm rounded-lg font-medium" style={{ backgroundColor: tenant.primaryColor }}>
                  {tenant.businessName}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/tenants/${id}/edit`)}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium transition"
                  style={{ backgroundColor: '#151194' }}
                >
                  Edit Tenant
                </button>
                <button
                  onClick={() => router.push('/tenants')}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Back to All Tenants
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
                >
                  Delete Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
