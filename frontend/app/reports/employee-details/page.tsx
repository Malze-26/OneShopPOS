'use client';

import { useEffect, useState } from 'react';
import { Search, User, Star, Activity } from 'lucide-react';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';
import { useSearchParams } from 'next/navigation';

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  role: string;
  orderCount: number;
  totalSales: number;
  lastActive: string | null;
}

interface Summary {
  activeEmployees: number;
  topPerformer: string;
  topPerformerSales: number;
  avgSalesPerEmployee: number;
}

interface ApiResponse {
  dateRange: string;
  summary: Summary;
  employees: EmployeeRow[];
}

export default function EmployeeDetailsPage() {
  const { currency } = useStore();
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (roleFilter !== 'all') params.set('role', roleFilter);

    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);

    api.get<ApiResponse>(`/reports/employee-details?${params.toString()}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [preset, searchParams, roleFilter]);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
  const s = data?.summary;

  const filtered = (data?.employees ?? []).filter(
    (e) =>
      (e?.name?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? '') ||
      (e?.email?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? '')
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Employee Details</h1>
        <p className="text-sm text-[#4a5565] mt-1">
          {loading ? 'Loading...' : `Overview of employee performance — ${data?.dateRange ?? ''}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">Active Employees</p>
              <h3 className="text-2xl font-bold text-[#101828] mb-1">{loading ? '—' : (s?.activeEmployees ?? 0)}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-light)' }}>
              <User className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#4a5565] mb-1">Top Performer</p>
              {loading ? (
                <p className="text-sm text-[#4a5565]">—</p>
              ) : s?.topPerformer && s.topPerformer !== 'N/A' ? (
                <>
                  <h3 className="text-lg font-bold text-[#101828] mb-1">{s.topPerformer}</h3>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{fmt(s.topPerformerSales)}</p>
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
              <p className="text-sm text-[#4a5565] mb-1">Avg Sales / Employee</p>
              {loading ? (
                <p className="text-sm text-[#4a5565]">—</p>
              ) : (
                <h3 className="text-2xl font-bold text-[#101828] mb-1">
                  {fmt(s?.avgSalesPerEmployee ?? 0)}
                </h3>
              )}
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f4f3ff' }}>
              <Activity className="w-6 h-6" style={{ color: '#7f56d9' }} />
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
                placeholder="Search employee name or email..."
                className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <NativeSelect
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-44"
            >
              <NativeSelectOption value="all">All Roles</NativeSelectOption>
              <NativeSelectOption value="Cashier">Cashier</NativeSelectOption>
              <NativeSelectOption value="Sales Representative">Sales Representative</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Employee Name', 'Email', 'Role', 'Orders Processed', 'Total Sales', 'Last Active'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-sm text-[#4a5565] text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-sm text-[#4a5565] text-center">No employee activity for this period</td></tr>
              ) : (
                filtered.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[#101828]">{emp.name}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{emp.email ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{emp.role}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{emp.orderCount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{fmt(emp.totalSales)}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">
                      {emp.lastActive ? new Date(emp.lastActive).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565]">
            Showing {filtered.length} of {(data?.employees ?? []).length} employees
          </p>
        </div>
      </div>
    </div>
  );
}
