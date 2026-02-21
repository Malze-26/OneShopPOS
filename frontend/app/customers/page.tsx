'use client';

import { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import api from '@/app/lib/api';

interface Customer {
  _id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase?: string;
}

interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  avgLifetimeValue: number;
}

type SortKey = 'recent' | 'spent_high' | 'spent_low' | 'orders';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = { sort };
        if (search.trim()) params.search = search.trim();

        const [customersRes, statsRes] = await Promise.allSettled([
          api.get('/customers', { params }),
          api.get('/customers/stats'),
        ]);

        if (customersRes.status === 'fulfilled') {
          setCustomers(customersRes.value.data.data);
          setError('');
        } else {
          setError('Failed to load customers.');
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [search, sort]);

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Customers</h1>
        <p className="text-sm text-[#4a5565]">View and manage customer information</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">Total Customers</p>
          <h3 className="text-2xl font-bold text-[#101828]">
            {stats ? stats.totalCustomers.toLocaleString() : '—'}
          </h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">New This Month</p>
          <h3 className="text-2xl font-bold text-[#101828]">
            {stats ? stats.newThisMonth.toLocaleString() : '—'}
          </h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">Average Lifetime Value</p>
          <h3 className="text-2xl font-bold text-[#101828]">
            {stats ? `LKR ${stats.avgLifetimeValue.toLocaleString()}` : '—'}
          </h3>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
          >
            <option value="recent">Sort by: Recent</option>
            <option value="spent_high">Sort by: Total Spent (High to Low)</option>
            <option value="spent_low">Sort by: Total Spent (Low to High)</option>
            <option value="orders">Sort by: Total Orders</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">All Customers</h2>
          <p className="text-xs text-[#4a5565] mt-1">
            {loading ? 'Loading...' : `Showing ${customers.length} customers`}
          </p>
        </div>

        {error && (
          <div className="px-5 py-4 text-sm text-red-600 bg-red-50 border-b border-[#e4e7ec]">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Customer', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Purchase', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#4a5565]">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#4a5565]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#eff4ff] rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-[#155dfc]">{customer.avatar}</span>
                        </div>
                        <div className="text-sm font-medium text-[#101828]">{customer.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{customer.email ?? '—'}</div></td>
                    <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{customer.phone ?? '—'}</div></td>
                    <td className="px-5 py-4"><div className="text-sm font-medium text-[#101828]">{customer.totalOrders}</div></td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-[#101828]">LKR {customer.totalSpent.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{formatDate(customer.lastPurchase)}</div></td>
                    <td className="px-5 py-4">
                      <button className="p-1.5 text-[#4a5565] hover:text-[#155dfc] hover:bg-[#eff4ff] rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">
            Showing {customers.length} of {stats?.totalCustomers ?? customers.length} customers
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors">
              Previous
            </button>
            <button className="px-3 py-1.5 bg-[#155dfc] text-white hover:bg-[#0d4dd9] rounded-lg text-sm font-medium transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
