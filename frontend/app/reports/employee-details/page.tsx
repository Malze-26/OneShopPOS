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

  const exportToCsv = () => {
    if (!data?.employees || filtered.length === 0) return;

    const headers = ['Employee Name', 'Email', 'Role', 'Orders Processed', 'Total Sales', 'Last Active'];
    
    const rows = filtered.map(emp => [
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${(emp.email || '').replace(/"/g, '""')}"`,
      `"${emp.role.replace(/"/g, '""')}"`,
      emp.orderCount,
      emp.totalSales,
      `"${emp.lastActive ? new Date(emp.lastActive).toLocaleString() : '—'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const safeDateRange = data.dateRange.replace(/[^a-z0-9-]/gi, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_details_${safeDateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar onExport={exportToCsv} />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Employee Details</h1>
        <p className="text-sm text-[#4a5565] mt-1">
          {loading ? 'Loading...' : `Overview of employee performance — ${data?.dateRange ?? ''}`}
        </p>
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
