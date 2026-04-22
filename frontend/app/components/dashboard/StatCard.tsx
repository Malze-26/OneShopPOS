'use client';

import Link from 'next/link';
import { StatCardData } from './types';

interface StatCardProps {
  stat: StatCardData;
}

/**
 * Displays a single KPI summary card with an icon, value, optional change
 * percentage, and an optional "View Details" link.
 */
export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm text-[#4a5565] mb-1">{stat.title}</p>
          <h3 className="text-2xl font-bold text-[#101828] mb-1">{stat.value}</h3>
          {stat.change && (
            <span className="text-sm font-medium" style={{ color: stat.changeColor }}>
              {stat.change}
            </span>
          )}
          <p className="text-xs text-[#4a5565] mt-1">{stat.subtext}</p>
        </div>
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: stat.iconBg }}
        >
          <Icon className="w-6 h-6" style={{ color: stat.iconColor }} />
        </div>
      </div>
      {stat.linkTo && (
        <Link
          href={stat.linkTo}
          className="text-sm text-[var(--color-primary)] hover:underline font-medium"
        >
          View Details →
        </Link>
      )}
    </div>
  );
}
