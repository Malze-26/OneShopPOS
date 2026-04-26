'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';

interface PaymentRow  { method: string; amount: number; txCount: number }
interface ZSummary    { grossSales: number; totalTransactions: number; refunds: number; voids: number }
interface ApiResponse { dateRange: string; summary: ZSummary; paymentBreakdown: PaymentRow[] }

export default function DailyZReportPage() {
  const { currency } = useStore();
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  const [data, setData]       = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);

    api.get<ApiResponse>(`/reports/daily-z-report?${params.toString()}`)
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [preset, searchParams]);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
  const s   = data?.summary;

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Daily Z-Report</h1>
        <p className="text-sm text-[#4a5565] mt-1">
          {loading ? 'Loading...' : `End-of-day POS closure summary — ${data?.dateRange ?? ''}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Gross Sales</p>
          <h3 className="text-2xl font-bold text-[#101828]">{loading ? '—' : fmt(s?.grossSales ?? 0)}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Total Transactions</p>
          <h3 className="text-2xl font-bold text-[#101828]">{loading ? '—' : (s?.totalTransactions ?? 0)}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Refunds / Voids</p>
          <h3 className="text-2xl font-bold text-[#101828]">{loading ? '—' : fmt((s?.refunds ?? 0) + (s?.voids ?? 0))}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">Payment Method Breakdown</h2>
          <p className="text-xs text-[#4a5565] mt-0.5">Total collected by payment type</p>
        </div>
        <div className="divide-y divide-[#e4e7ec]">
          {loading ? (
            <div className="px-5 py-8 text-sm text-[#4a5565] text-center">Loading...</div>
          ) : (data?.paymentBreakdown ?? []).length === 0 ? (
            <div className="px-5 py-8 text-sm text-[#4a5565] text-center">No transactions for this period</div>
          ) : (
            (data?.paymentBreakdown ?? []).map((row) => (
              <div key={row.method} className="flex items-center justify-between px-5 py-4 hover:bg-[#f9fafb] transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#101828]">{row.method}</p>
                  <p className="text-xs text-[#4a5565] mt-0.5">{row.txCount} transactions</p>
                </div>
                <p className="text-sm font-semibold text-[#101828]">{fmt(row.amount)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
