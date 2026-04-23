'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin,
  Calendar, Edit2, Trash2, Palette,
} from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import { tenantAPI } from '../../../../utils/api';

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

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

const planStyles: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-green-100 text-green-800',
};

export default function ViewTenantPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
    if (id) fetchTenant();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tenant?.businessName}"? This cannot be undone.`)) return;
    try {
      const data = await tenantAPI.delete(id);
      if (data.success) {
        router.push('/super-admin/tenants');
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
              onClick={() => router.push('/super-admin/tenants')}
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

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/super-admin/tenants')}
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
                {tenant.subscription?.plan || 'free'} plan
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/super-admin/tenants/${id}/edit`)}
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

          {/* Left — Business Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Business Details */}
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
                      {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Last Updated</p>
                    <p className="text-gray-900">
                      {new Date(tenant.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Subscription</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Plan</p>
                  <p className="font-semibold text-gray-900 capitalize">{tenant.subscription?.plan || 'Free'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{tenant.subscription?.status || 'Active'}</p>
                </div>
                {tenant.subscription?.startDate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(tenant.subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {tenant.subscription?.endDate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(tenant.subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Branding */}
          <div className="space-y-6">

            {/* Logo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
              </div>

              {tenant.logo ? (
                <img
                  src={tenant.logo}
                  alt={`${tenant.businessName} logo`}
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
                  <div
                    className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm"
                    style={{ backgroundColor: tenant.primaryColor }}
                  />
                  <span className="font-mono text-sm text-gray-700">{tenant.primaryColor}</span>
                </div>
              </div>

              {/* Color preview */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <button
                  className="w-full py-2 text-white text-sm rounded-lg font-medium"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  {tenant.businessName}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/super-admin/tenants/${id}/edit`)}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium transition"
                  style={{ backgroundColor: '#151194' }}
                >
                  Edit Tenant
                </button>
                <button
                  onClick={() => router.push('/super-admin/tenants')}
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
