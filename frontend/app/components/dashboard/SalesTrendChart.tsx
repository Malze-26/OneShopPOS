'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SalesTrendPoint } from './types';

interface SalesTrendChartProps {
  data: SalesTrendPoint[];
}

/**
 * Line chart showing daily sales totals over a recent period.
 * Data is provided by the parent — this component is purely presentational.
 *
 * TODO: Wire up a real API endpoint (e.g. GET /api/transactions/trend?days=7)
 *       and replace the placeholder data passed from the dashboard page.
 */
export function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Sales Trend</h2>
          <p className="text-xs text-[#4a5565] mt-1">Last 7 days performance</p>
        </div>
        {/* TODO: hook onChange to refetch with a different date range */}
        <select className="px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
          <XAxis dataKey="date" stroke="#4a5565" style={{ fontSize: '12px' }} />
          <YAxis stroke="#4a5565" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e7ec', borderRadius: '8px' }}
            labelStyle={{ color: '#101828', fontWeight: 600 }}
          />
          <Line type="monotone" dataKey="sales" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
