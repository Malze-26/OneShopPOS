'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download } from 'lucide-react';
import { ReportsTabs } from '../components/ReportsTabs';
import { ReportsDateToolbar } from '../components/ReportsDateToolbar';

const summaryCards = [
  {
    title: "Gross Sales",
    value: 'LKR 1,449,000',
    change: '▲ 12%',
    changeColor: '#12b76a',
    subtext: 'vs yesterday',
  },
  {
    title: 'Discounts & Refunds',
    value: '179',
    change: '▲ 8%',
    changeColor: '#12b76a',
    subtext: 'vs yesterday',
  },
  {
    title: 'Net Sales',
    value: 'LKR 8,095',
    change: '▼ 2%',
    changeColor: '#f79009',
    subtext: 'vs yesterday',
  },
  {
    title: 'Total Tax',
    value: 'LKR 1,200',
    subtext: '145 units sold',
  },
  {
    title: 'Transactions',
    value: '179',
    subtext: '145 units sold',
  },
  {
    title: 'Avg. Order Value',
    value: 'LKR 1,200',
    subtext: '145 units sold',
  },
];

const hourlySales = [
  { time: '9 AM', sales: 45000 },
  { time: '10 AM', sales: 98000 },
  { time: '11 AM', sales: 145000 },
  { time: '12 PM', sales: 185000 },
  { time: '1 PM', sales: 165000 },
  { time: '2 PM', sales: 132000 },
  { time: '3 PM', sales: 154000 },
  { time: '4 PM', sales: 173000 },
  { time: '5 PM', sales: 214000 },
  { time: '6 PM', sales: 126000 },
];

const channelSales = [
  { name: 'POS (Direct)', value: 65, amount: '65%', color: 'var(--color-primary)' },
  { name: 'Online Store', value: 35, amount: '35%', color: '#7c3aed' },
];

const paymentMethods = [
  { name: 'Credit Card', percentage: 50 },
  { name: 'Cash', percentage: 75 },
];

const salesBreakdownData = [
  { date: 'Oct 24, 2023', pos: 'Rs. 150,000', online: 'Rs. 45,000', gross: 'Rs. 195,000', discount: '-Rs. 5,000', net: 'Rs. 190,000' },
  { date: 'Oct 25, 2023', pos: 'Rs. 182,500', online: 'Rs. 62,000', gross: 'Rs. 244,500', discount: '-Rs. 12,500', net: 'Rs. 232,000' },
  { date: 'Oct 26, 2023', pos: 'Rs. 134,000', online: 'Rs. 38,500', gross: 'Rs. 172,500', discount: '-Rs. 3,200', net: 'Rs. 169,300' },
  { date: 'Oct 27, 2023', pos: 'Rs. 210,000', online: 'Rs. 85,000', gross: 'Rs. 295,000', discount: '-Rs. 18,000', net: 'Rs. 277,000' },
];

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Sales Summary</h1>
        <p className="text-sm text-[#4a5565] mt-1">Comprehensive business analytics and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
            <p className="text-sm text-[#4a5565] mb-1">{card.title}</p>
            <h3 className="text-2xl font-bold text-[#101828] mb-1">{card.value}</h3>
            {card.change && (
              <span className="text-sm font-medium" style={{ color: card.changeColor }}>
                {card.change}
              </span>
            )}
            <p className="text-xs text-[#4a5565] mt-1">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">Sales Trend</h2>
            <p className="text-xs text-[#4a5565] mt-0.5">February 20, 2026</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-[#e4e7ec] text-sm text-[#4a5565] hover:bg-[#f9fafb] transition-colors">
            Filter
          </button>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlySales} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e4e7ec" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#4a5565' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#4a5565' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Sales']}
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
        {/* Sales by Channel */}
        <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#101828] mb-1">Sales by Channel</h2>
          <p className="text-xs text-[#4a5565] mb-4">Today&apos;s breakdown</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelSales}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelSales.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {channelSales.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#4a5565]">{item.name}</span>
                </div>
                <span className="font-medium text-[#101828]">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Payment Method */}
        <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#101828] mb-1">Sales by Payment Method</h2>
          <p className="text-xs text-[#4a5565] mb-6">Today&apos;s breakdown</p>
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
        </div>
      </div>

      {/* Sales Breakdown Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#e4e7ec]">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">Sales Breakdown</h2>
            <p className="text-xs text-[#4a5565] mt-0.5">Showing {salesBreakdownData.length} entries</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Date', 'POS (In-Store)', 'Online', 'Gross Sales', 'Discounts', 'Net Sales'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {salesBreakdownData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-[#101828]">{row.date}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{row.pos}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{row.online}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{row.gross}</td>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: '#f04438' }}>{row.discount}</td>
                  <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{row.net}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#f9fafb] border-t border-[#e4e7ec]">
              <tr>
                <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Totals</td>
                <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Rs. 676,500</td>
                <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Rs. 230,500</td>
                <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Rs. 907,000</td>
                <td className="px-5 py-4 text-sm font-semibold" style={{ color: '#f04438' }}>-Rs. 38,700</td>
                <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Rs. 868,300</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
