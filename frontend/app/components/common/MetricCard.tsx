import { ElementType } from 'react';

interface MetricCardProps {
  icon: ElementType;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

export default function MetricCard({ icon: Icon, label, value, trend, trendUp }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#151194' + '20' }}>
          <Icon className="w-6 h-6" style={{ color: '#151194' }} />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}
