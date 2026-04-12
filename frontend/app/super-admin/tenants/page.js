'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Plus, Search, Eye, Edit2, Trash2, MapPin, Phone, Calendar } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';

export default function TenantManagementPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Mock tenant data
  const tenants = [
    {
      id: 1,
      name: 'Store 1',
      address: 'Address 1',
      contact: 'Contact number 1',
      createdDate: 'Created Date 1',
      status: 'active',
      logo: null,
    },
    {
      id: 2,
      name: 'Store 2',
      address: 'Address 2',
      contact: 'Contact number 2',
      createdDate: 'Created Date 2',
      status: 'active',
      logo: null,
    },
    {
      id: 3,
      name: 'Store 3',
      address: 'Address 3',
      contact: 'Contact number 3',
      createdDate: 'Created Date 3',
      status: 'active',
      logo: null,
    },
  ];

  const stats = [
    { label: 'Total Tenants', value: '24', icon: Store },
    { label: 'Active', value: '21', icon: null, color: 'green' },
    { label: 'Inactive', value: '3', icon: null, color: 'red' },
    { label: 'This Month', value: '5', icon: Calendar, color: 'purple' },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Management</h1>
              <p className="text-gray-600">Manage all business tenants and their settings</p>
            </div>
            <button
              onClick={() => router.push('/super-admin/tenants/create')}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition"
              style={{ backgroundColor: '#151194' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0d0a62'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#151194'}
            >
              <Plus className="w-5 h-5" />
              Add New Tenant
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                {stat.icon && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <stat.icon className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              {stat.color === 'green' && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active
                  </span>
                </div>
              )}
              {stat.color === 'red' && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-sm text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Inactive
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Tenants
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by business name..."
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="w-full lg:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-6 py-2.5 rounded-lg font-medium transition ${
                    viewMode === 'grid'
                      ? 'text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={viewMode === 'grid' ? { backgroundColor: '#151194' } : {}}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-6 py-2.5 rounded-lg font-medium transition ${
                    viewMode === 'table'
                      ? 'text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={viewMode === 'table' ? { backgroundColor: '#151194' } : {}}
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                {/* Tenant Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {tenant.logo ? (
                      <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Store className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{tenant.name}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      Active
                    </span>
                  </div>
                </div>

                {/* Tenant Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{tenant.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{tenant.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{tenant.createdDate}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View (Optional - if they switch to table) */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tenant.contact}</td>
                    <td className="px-6 py-4 text-gray-600">{tenant.createdDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-red-100 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}