'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Store, Plus, Eye, Edit2, Trash2, Calendar } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { tenantAPI } from '../../utils/api';

interface Subscription {
  plan: string;
  status: string;
}

interface Tenant {
  _id: string;
  businessName: string;
  businessAddress?: string;
  phoneNumber?: string;
  email: string;
  status: string;
  subscription: Subscription;
  primaryColor?: string;
  createdAt: string;
}

function TenantManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantAPI.getAll();
      if (data.success) {
        setTenants(data.tenants);
      } else {
        setError(data.message || 'Failed to fetch tenants');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    try {
      const data = await tenantAPI.delete(id);
      if (data.success) {
        fetchTenants();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Error deleting tenant');
    }
  };

  const stats = [
    { label: 'Total Tenants', value: tenants.length, icon: Store },
    { label: 'Active', value: tenants.filter((t) => t.status === 'active').length, color: 'green' },
    { label: 'Inactive', value: tenants.filter((t) => t.status === 'inactive').length, color: 'red' },
    {
      label: 'This Month',
      value: tenants.filter((t) => {
        const created = new Date(t.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      icon: Calendar,
      color: 'purple',
    },
  ];

  const q = searchTerm.toLowerCase().trim();
  const filteredTenants = tenants.filter((tenant) => {
    const nameMatch = !q || tenant.businessName.toLowerCase().includes(q);
    const statusMatch = statusFilter === 'all' || tenant.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading tenants...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTenants}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-gray-600">Manage all registered businesses</p>
          </div>
          <button
            onClick={() => router.push('/tenants/create')}
            className="flex items-center gap-2 px-5 py-2 text-white rounded-lg"
            style={{ backgroundColor: '#151194' }}
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="p-4 bg-white shadow-sm rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tenants..."
            className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>
        </div>

        {filteredTenants.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No tenants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
              <div
                key={tenant._id}
                className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div
                  className="h-1 rounded-full mb-4"
                  style={{ backgroundColor: tenant.primaryColor || '#151194' }}
                />

                <h3 className="font-bold text-lg text-gray-900 mb-1">{tenant.businessName}</h3>
                <p className="text-sm text-gray-500 mb-1">{tenant.email}</p>
                {tenant.businessAddress && (
                  <p className="text-sm text-gray-400 mb-3">{tenant.businessAddress}</p>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(tenant.status)}`}>
                    {tenant.status}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {tenant.subscription?.plan || 'basic'}
                  </span>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/tenants/${tenant._id}`)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Eye size={15} /> View
                  </button>
                  <button
                    onClick={() => router.push(`/tenants/${tenant._id}/edit`)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Edit2 size={15} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tenant._id)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 ml-auto"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TenantManagementPage />
    </Suspense>
  );
}
