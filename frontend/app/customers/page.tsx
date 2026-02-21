'use client';

import { useState } from 'react';
import { Search, Eye } from 'lucide-react';

const customersData = [
  { id: 1, name: 'Customer 001', avatar: 'C1', email: 'customer001@email.com', phone: '+94 71 111 1111', totalOrders: 24, totalSpent: 234000, lastPurchase: '2026-02-20' },
  { id: 2, name: 'Customer 002', avatar: 'C2', email: 'customer002@email.com', phone: '+94 71 222 2222', totalOrders: 18, totalSpent: 189000, lastPurchase: '2026-02-19' },
  { id: 3, name: 'Customer 003', avatar: 'C3', email: 'customer003@email.com', phone: '+94 71 333 3333', totalOrders: 32, totalSpent: 456000, lastPurchase: '2026-02-20' },
  { id: 4, name: 'Customer 004', avatar: 'C4', email: 'customer004@email.com', phone: '+94 71 444 4444', totalOrders: 12, totalSpent: 145000, lastPurchase: '2026-02-18' },
  { id: 5, name: 'Customer 005', avatar: 'C5', email: 'customer005@email.com', phone: '+94 71 555 5555', totalOrders: 28, totalSpent: 312000, lastPurchase: '2026-02-20' },
  { id: 6, name: 'Customer 006', avatar: 'C6', email: 'customer006@email.com', phone: '+94 71 666 6666', totalOrders: 15, totalSpent: 178000, lastPurchase: '2026-02-17' },
  { id: 7, name: 'Customer 007', avatar: 'C7', email: 'customer007@email.com', phone: '+94 71 777 7777', totalOrders: 21, totalSpent: 267000, lastPurchase: '2026-02-19' },
  { id: 8, name: 'Customer 008', avatar: 'C8', email: 'customer008@email.com', phone: '+94 71 888 8888', totalOrders: 9, totalSpent: 98000, lastPurchase: '2026-02-16' },
];

type SortKey = 'recent' | 'spent_high' | 'spent_low' | 'orders';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const sorted = [...customersData]
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    .sort((a, b) => {
      if (sort === 'spent_high') return b.totalSpent - a.totalSpent;
      if (sort === 'spent_low') return a.totalSpent - b.totalSpent;
      if (sort === 'orders') return b.totalOrders - a.totalOrders;
      return b.id - a.id;
    });

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
          <h3 className="text-2xl font-bold text-[#101828]">1,248</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">New This Month</p>
          <h3 className="text-2xl font-bold text-[#101828]">87</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">Average Lifetime Value</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR 198,500</h3>
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
          <p className="text-xs text-[#4a5565] mt-1">Showing {sorted.length} customers</p>
        </div>
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
              {sorted.map((customer) => (
                <tr key={customer.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#eff4ff] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-[#155dfc]">{customer.avatar}</span>
                      </div>
                      <div className="text-sm font-medium text-[#101828]">{customer.name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{customer.email}</div></td>
                  <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{customer.phone}</div></td>
                  <td className="px-5 py-4"><div className="text-sm font-medium text-[#101828]">{customer.totalOrders}</div></td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-[#101828]">LKR {customer.totalSpent.toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-4"><div className="text-sm text-[#4a5565]">{customer.lastPurchase}</div></td>
                  <td className="px-5 py-4">
                    <button className="p-1.5 text-[#4a5565] hover:text-[#155dfc] hover:bg-[#eff4ff] rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">Showing 1 to {sorted.length} of 1,248 customers</p>
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
