'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Download } from 'lucide-react';
import { ReportsTabs } from '../components/ReportsTabs';
import { ReportsDateToolbar } from '../components/ReportsDateToolbar';
import { useStore } from '@/app/contexts/StoreContext';
import api from '@/app/lib/api';

interface SalesSummary {
  grossSales: number; refundsCount: number; refundTotal: number;
  netSales: number; transactionCount: number; avgOrderValue: number;
}
interface HourlyPoint  { time: string; sales: number }
interface PaymentMethod { name: string; amount: number; count: number; percentage: number }
interface DailyRow     { date: string; grossSales: number; count: number }
interface ApiResponse {
  dateRange: string;
  summary: SalesSummary;
  hourlySales: HourlyPoint[];
  paymentMethods: PaymentMethod[];
  salesBreakdown: DailyRow[];
}

const CHANNEL_COLORS = ['var(--color-primary)', '#7c3aed'];

export default function ReportsPage() {
  const { currency } = useStore();
  const [data, setData]       = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse>('/reports/sales-summary?preset=today')
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  const summary = data?.summary;
  const summaryCards = [
    { title: 'Gross Sales',         value: fmt(summary?.grossSales       ?? 0) },
    { title: 'Discounts & Refunds', value: String(summary?.refundsCount  ?? 0) },
    { title: 'Net Sales',           value: fmt(summary?.netSales         ?? 0) },
    { title: 'Total Tax',           value: fmt(0) },
    { title: 'Transactions',        value: String(summary?.transactionCount ?? 0) },
    { title: 'Avg. Order Value',    value: fmt(summary?.avgOrderValue    ?? 0) },
  ];

  const hourlySales   = data?.hourlySales    ?? [];
  const paymentMethods = data?.paymentMethods ?? [];
  const salesBreakdown = data?.salesBreakdown ?? [];

  const totals = salesBreakdown.reduce(
    (acc, r) => ({ grossSales: acc.grossSales + r.grossSales }),
    { grossSales: 0 }
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Sales Summary</h1>
        <p className="text-sm text-[#4a5565] mt-1">
          {loading ? 'Loading...' : (data?.dateRange ?? 'Comprehensive business analytics and insights')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
            <p className="text-sm text-[#4a5565] mb-1">{card.title}</p>
            <h3 className="text-2xl font-bold text-[#101828]">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Hourly Sales Trend */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">Sales Trend</h2>
            <p className="text-xs text-[#4a5565] mt-0.5">{data?.dateRange ?? 'Today'}</p>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlySales} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e4e7ec" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#4a5565' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#4a5565' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [fmt(value), 'Sales']}
                cursor={{ fill: 'var(--color-primary-light)' }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e4e7ec', fontSize: 12 }}
              />
              <Bar dataKey="sales" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Sales by Channel — all POS for tenant stores */}
        <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#101828] mb-1">Sales by Channel</h2>
          <p className="text-xs text-[#4a5565] mb-4">Today&apos;s breakdown</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: 'POS (Direct)', value: 100, color: CHANNEL_COLORS[0] }]}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                >
                  <Cell fill={CHANNEL_COLORS[0]} />
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-sm mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[0] }} />
              <span className="text-[#4a5565]">POS (Direct)</span>
            </div>
            <span className="font-medium text-[#101828]">100%</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#101828] mb-1">Sales by Payment Method</h2>
          <p className="text-xs text-[#4a5565] mb-6">Today&apos;s breakdown</p>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-[#4a5565] text-center py-6">No transactions yet</p>
          ) : (
            <div className="space-y-6">
              {paymentMethods.map((method) => (
                <div key={method.name}>
                  <div className="flex justify-between items-center text-sm font-medium text-[#101828] mb-2">
                    <span>{method.name}</span>
                    <span>{method.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#f9fafb] rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full"
                      style={{ width: `${method.percentage}%`, backgroundColor: 'var(--color-primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Breakdown Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#e4e7ec]">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">Sales Breakdown</h2>
            <p className="text-xs text-[#4a5565] mt-0.5">Showing {salesBreakdown.length} entries</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Date', 'Gross Sales', 'Transactions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {salesBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-sm text-[#4a5565] text-center">
                    No sales data for this period
                  </td>
                </tr>
              ) : (
                salesBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[#101828]">{row.date}</td>
                    <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {fmt(row.grossSales)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
            {salesBreakdown.length > 0 && (
              <tfoot className="bg-[#f9fafb] border-t border-[#e4e7ec]">
                <tr>
                  <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Totals</td>
                  <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {fmt(totals.grossSales)}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#101828]">
                    {salesBreakdown.reduce((s, r) => s + r.count, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
