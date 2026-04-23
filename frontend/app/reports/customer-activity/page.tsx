'use client';

import { useState } from 'react';
import { Search, User, Star, PieChart, ArrowUp } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';

const customerData = [
  { name: 'Wireless Headphones', phone: '0712345678', type: 'Returning', orders: 12, spent: 'Rs. 60,000', loyalty: 'Gold' },
  { name: 'USB-C Cable 2m',      phone: '0779876543', type: 'New',       orders: 1,  spent: 'Rs. 22,500', loyalty: 'Silver' },
  { name: 'Mechanical Keyboard', phone: '0754567890', type: 'Returning', orders: 5,  spent: 'Rs. 45,000', loyalty: 'Platinum' },
];

const loyaltyColors: Record<string, { bg: string; text: string }> = {
  Gold:     { bg: '#fffaeb', text: '#f79009' },
  Silver:   { bg: '#f9fafb', text: '#4a5565' },
  Platinum: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
};

export default function CustomerActivityPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = customerData.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Daily Customer Activity</h1>
        <p className="text-sm text-[#4a5565] mt-1">Real-time overview of customer interactions and transactional performance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">Unique Customers</p>
              <h3 className="text-2xl font-bold text-[#101828] mb-1">142</h3>
              <span className="text-sm font-medium" style={{ color: '#12b76a' }}>▲ 12</span>
              <p className="text-xs text-[#4a5565] mt-1">vs yesterday</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-light)' }}>
              <User className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">Top Spender</p>
              <h3 className="text-xl font-bold text-[#101828] mb-1">Nimal Perera</h3>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Rs. 45,000</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fffaeb' }}>
              <Star className="w-6 h-6" style={{ color: '#f79009' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">New vs Returning</p>
              <h3 className="text-2xl font-bold text-[#101828] mb-1">85% <span className="text-sm font-normal text-[#4a5565]">Returning</span></h3>
              <div className="flex items-center gap-3 text-xs text-[#4a5565]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#12b76a' }} />
                  85% Returning
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-primary)' }} />
                  15% New
                </div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f4f3ff' }}>
              <PieChart className="w-6 h-6" style={{ color: '#7f56d9' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec] flex flex-wrap gap-3 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              placeholder="Search customer or phone..."
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Categories</NativeSelectOption>
              <NativeSelectOption value="baby">Baby Products</NativeSelectOption>
              <NativeSelectOption value="bakery">Bakery</NativeSelectOption>
              <NativeSelectOption value="beverages">Beverages</NativeSelectOption>
            </NativeSelect>
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Channels</NativeSelectOption>
              <NativeSelectOption value="pos">POS (In-store)</NativeSelectOption>
              <NativeSelectOption value="online">E-commerce (Online)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Customer Name', 'Phone', 'Type', 'Orders', 'Total Spent', 'Loyalty'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {filtered.map((customer, idx) => (
                <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-[#101828]">{customer.name}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.phone}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.type}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.orders}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{customer.spent}</td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: loyaltyColors[customer.loyalty]?.bg,
                        color: loyaltyColors[customer.loyalty]?.text,
                      }}
                    >
                      {customer.loyalty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">Showing 1 to {filtered.length} of {customerData.length} customers</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] rounded-lg text-sm font-medium transition-colors" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
