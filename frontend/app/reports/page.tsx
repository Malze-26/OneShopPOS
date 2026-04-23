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
import { CalendarDays, Download, Percent } from 'lucide-react';
import { ReportsTabs } from '../components/ReportsTabs';
import { ReportsDateToolbar } from '../components/ReportsDateToolbar';

const summaryCards = [
  {
    title: 'Gross Sales',
    value: 'LKR 1,449,000',
    delta: '12% vs yesterday',
    deltaColor: 'text-[#12b76a]',
    deltaArrow: '▲',
  },
  {
    title: 'Discounts & Refunds',
    value: '179',
    delta: '8% vs yesterday',
    deltaColor: 'text-[#12b76a]',
    deltaArrow: '▲',
  },
  {
    title: 'Net Sales',
    value: 'LKR 8,095',
    delta: '2% vs yesterday',
    deltaColor: 'text-[#f79009]',
    deltaArrow: '▼',
  },
  {
    title: 'Total Tax',
    value: 'LKR 1,200',
    delta: '145 units sold',
    deltaColor: 'text-[#98a2b3]',
    deltaArrow: '',
  },
   {
    title: 'Transactions',
    value: 'LKR 1,200',
    delta: '145 units sold',
    deltaColor: 'text-[#98a2b3]',
    deltaArrow: '',
   },
   {
    title: 'ADV',
    value: 'LKR 1,200',
    delta: '145 units sold',
    deltaColor: 'text-[#98a2b3]',
    deltaArrow: '',
  }
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

const categorySales = [
  { name: 'POS(Direct)',value:65, amount:'65%', color: '#2563eb' },
  { name: 'Online Store',value:35, amount:'35%', color: '#7c3aed' },
];

const cashierPerformance = [
  { name: 'Cashier_01', orders: 89, avg: 'LKR 5,123', total: 'LKR 456,000' },
  { name: 'Cashier_02', orders: 76, avg: 'LKR 5,118', total: 'LKR 389,000' },
  { name: 'Cashier_03', orders: 64, avg: 'LKR 4,875', total: 'LKR 312,000' },
  { name: 'Cashier_04', orders: 51, avg: 'LKR 4,804', total: 'LKR 245,000' },
];

const paymentMethods = [
  { name: 'Credit Card', percentage: 50 },
  { name: 'Cash', percentage: 75 },
];

// Added Sales Breakdown data based on image
const salesBreakdownData = [
  { date: 'Oct 24, 2023', pos: 'Rs. 150,000', online: 'Rs. 45,000', gross: 'Rs. 195,000', discount: '-Rs. 5,000', net: 'Rs. 190,000' },
  { date: 'Oct 25, 2023', pos: 'Rs. 182,500', online: 'Rs. 62,000', gross: 'Rs. 244,500', discount: '-Rs. 12,500', net: 'Rs. 232,000' },
  { date: 'Oct 26, 2023', pos: 'Rs. 134,000', online: 'Rs. 38,500', gross: 'Rs. 172,500', discount: '-Rs. 3,200', net: 'Rs. 169,300' },
  { date: 'Oct 27, 2023', pos: 'Rs. 210,000', online: 'Rs. 85,000', gross: 'Rs. 295,000', discount: '-Rs. 18,000', net: 'Rs. 277,000' },
];

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px]">
      <div className="mb-4">
       <ReportsTabs />
       <ReportsDateToolbar />
      </div>
        <div className="mb-4">
        <h2 className="text-2xl font-bold text-[#101828]">Sales Summary</h2>
        <p className="text-sm text-[#667085] mt-1">Comprehensive business analytics and insights</p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl border border-[#e4e7ec] p-4">
            <p className="text-xs text-[#98a2b3] font-medium">{card.title}</p>
            <h3 className="text-[30px] leading-9 font-bold text-[#101828] mt-1">{card.value}</h3>
            <p className={`text-xs mt-2 font-medium ${card.deltaColor}`}>
              {card.deltaArrow ? `${card.deltaArrow} ` : ''}
              {card.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ec] p-4 md:p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-[#101828]">Sales Trend</h3>
            <p className="text-xs text-[#98a2b3]">February 20, 2026</p>
          </div>
          <button className="h-8 w-20 rounded-lg border border-[#e4e7ec] text-xs text-[#667085] hover:bg-[#f9fafb]">
            Filter
          </button>
        </div>

        <div className="h-[260px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlySales} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={true} horizontal={true} stroke="#eef2f6" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#667085' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Sales']}
                cursor={{ fill: '#eff4ff' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #e4e7ec' }}
              />
              <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={46} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[#e4e7ec] p-4 md:p-5">
          <h3 className="text-base font-semibold text-[#101828] mb-4">Sales by Channel</h3>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySales}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ value }) => `${value}%`}
                  labelLine={false}
                >
                  {categorySales.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2">
            {categorySales.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#667085]">{item.name}</span>
                </div>
                <span className="font-semibold text-[#344054]">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e4e7ec] p-4 md:p-5">
          <h3 className="text-base font-semibold text-[#101828] mb-6">Sales by Payment Method</h3>

          <div className="space-y-6">
            {paymentMethods.map((method) => (
              <div key={method.name}>
                <div className="flex justify-between items-center text-[13px] font-medium text-[#344054] mb-2">
                  <span>{method.name}</span>
                  <span className="text-[#101828] font-semibold">{method.percentage}%</span>
                </div>
                {/* Progress bar background */}
                <div className="w-full bg-[#f4f3ff] rounded-full h-2.5">
                  {/* Progress bar fill */}
                  <div
                    className="bg-[#1d4ed8] h-2.5 rounded-full"
                    style={{ width: `${method.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ New Sales Breakdown Table added at the bottom */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-[#e4e7ec]">
          <h3 className="text-lg font-semibold text-[#101828]">Sales Breakdown</h3>
          <button className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors">
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#f8f9fc] text-[11px] font-bold text-[#667085] uppercase tracking-wider border-b border-[#e4e7ec]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">POS (In-Store)</th>
                <th className="px-6 py-4">Online</th>
                <th className="px-6 py-4">Gross Sales</th>
                <th className="px-6 py-4">Discounts</th>
                <th className="px-6 py-4">Net Sales</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#e4e7ec]">
              {salesBreakdownData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-[#101828] font-bold text-[13px]">{row.date}</td>
                  <td className="px-6 py-4 text-[#475467] text-[13px]">{row.pos}</td>
                  <td className="px-6 py-4 text-[#475467] text-[13px]">{row.online}</td>
                  <td className="px-6 py-4 text-[#475467] text-[13px]">{row.gross}</td>
                  <td className="px-6 py-4 text-[#ef4444] font-medium text-[13px]">{row.discount}</td>
                  <td className="px-6 py-4 text-[#3b82f6] font-bold text-[13px]">{row.net}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#f8f9fc] font-bold text-[13px] border-t border-[#e4e7ec]">
              <tr>
                <td className="px-6 py-4 text-[#101828]">Totals</td>
                <td className="px-6 py-4 text-[#101828]">Rs. 676,500</td>
                <td className="px-6 py-4 text-[#101828]">Rs. 230,500</td>
                <td className="px-6 py-4 text-[#101828]">Rs. 907,000</td>
                <td className="px-6 py-4 text-[#ef4444] font-medium">-Rs. 38,700</td>
                <td className="px-6 py-4 text-[#3b82f6]">Rs. 868,300</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
    </div>
  );
}