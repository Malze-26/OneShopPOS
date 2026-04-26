'use client';

import { useEffect, useState } from 'react';
import { Search, User, Star, PieChart } from 'lucide-react';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';
import { useSearchParams } from 'next/navigation';

interface CustomerRow {
  name: string; phone: string; type: string;
  orderCount: number; spent: number; loyaltyTier: string;
}
interface Summary {
  uniqueCustomers: number; topSpender: string; topSpenderAmount: number;
  newVsReturning: { returning: number; new: number };
}
interface ApiResponse { dateRange: string; summary: Summary; customers: CustomerRow[] }

const loyaltyColors: Record<string, { bg: string; text: string }> = {
  Gold: { bg: '#fffaeb', text: '#f79009' },
  Silver: { bg: '#f9fafb', text: '#4a5565' },
  Platinum: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
  Bronze: { bg: '#fef3f2', text: '#b45309' },
};

export default function CustomerActivityPage() {
  const { currency } = useStore();
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('all');
  const [channel, setChannel] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (customerType !== 'all') params.set('customerType', customerType);
    if (channel !== 'all') params.set('channel', channel);

    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);

    api.get<ApiResponse>(`/reports/customer-activity?${params.toString()}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [preset, searchParams, customerType, channel]);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
  const s = data?.summary;

  const filtered = (data?.customers ?? []).filter(
    (c) =>
      (c?.name?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? '') ||
      (c?.phone ?? '').includes(searchTerm ?? ''),
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Daily Customer Activity</h1>
        <p className="text-sm text-[#4a5565] mt-1">
          {loading ? 'Loading...' : `Real-time overview of customer interactions — ${data?.dateRange ?? ''}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">Unique Customers</p>
              <h3 className="text-2xl font-bold text-[#101828] mb-1">{loading ? '—' : (s?.uniqueCustomers ?? 0)}</h3>
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
              {loading ? (
                <p className="text-sm text-[#4a5565]">—</p>
              ) : s?.topSpender && s.topSpender !== 'N/A' ? (
                <>
                  <h3 className="text-lg font-bold text-[#101828] mb-1">{s.topSpender}</h3>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{fmt(s.topSpenderAmount)}</p>
                </>
              ) : (
                <p className="text-sm text-[#4a5565]">No data yet</p>
              )}
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
              {loading ? (
                <p className="text-sm text-[#4a5565]">—</p>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-[#101828] mb-1">
                    {s?.newVsReturning?.returning ?? 0}%{' '}
                    <span className="text-sm font-normal text-[#4a5565]">Returning</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#4a5565]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#12b76a' }} />
                      {s?.newVsReturning?.returning ?? 0}% Returning
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-primary)' }} />
                      {s?.newVsReturning?.new ?? 0}% New
                    </div>
                  </div>
                </>
              )}
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
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
              <input
                type="text"
                placeholder="Search customer or phone..."
                className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <NativeSelect
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className="w-44"
            >
              <NativeSelectOption value="all">All Customers</NativeSelectOption>
              <NativeSelectOption value="new">New Customers</NativeSelectOption>
              <NativeSelectOption value="returning">Returning Customers</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-44"
            >
              <NativeSelectOption value="all">All Channels</NativeSelectOption>
              <NativeSelectOption value="pos">POS (In-store)</NativeSelectOption>
              <NativeSelectOption value="online">E-commerce (Online)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Customer Name', 'Email', 'Phone', 'Type', 'Orders', 'Total Spent', 'Loyalty', 'Last Order'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-sm text-[#4a5565] text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-sm text-[#4a5565] text-center">No customer activity for this period</td></tr>
              ) : (
                filtered.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[#101828]">{customer.name}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.email ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.type}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.orderCount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{fmt(customer.spent)}</td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: loyaltyColors[customer.loyaltyTier]?.bg ?? '#f9fafb',
                          color: loyaltyColors[customer.loyaltyTier]?.text ?? '#4a5565',
                        }}
                      >
                        {customer.loyaltyTier}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">
                      {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565]">
            Showing {filtered.length} of {(data?.customers ?? []).length} customers
          </p>
        </div>
      </div>
    </div>
  );
}
