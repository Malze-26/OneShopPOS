'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PaymentEntry } from './types';

interface PaymentMethodChartProps {
  data: PaymentEntry[];
  currency: string;
}

/**
 * Donut pie chart that shows today's payment method breakdown.
 * Includes a legend below the chart with percentage and raw amount per method.
 * Data is fetched live from GET /api/transactions/stats by the parent.
 */
export function PaymentMethodChart({ data, currency }: PaymentMethodChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <h2 className="text-base font-semibold text-[#101828] mb-1">Payment Methods</h2>
      <p className="text-xs text-[#4a5565] mb-4">Today&apos;s breakdown</p>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2 mt-4">
        {data.map((method) => (
          <div key={method.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
              <span className="text-[#4a5565]">{method.name}</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-[#101828]">{method.value}%</div>
              <div className="text-xs text-[#4a5565]">
                {currency} {method.amount.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
