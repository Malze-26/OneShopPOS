'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Sales Summary', href: '/reports' },
  { label: 'Daily Z-Report', href: '/reports/daily-z-report' },
  { label: 'Sales by Product', href: '/reports/sales-by-product' },
  { label: 'Inventory Status', href: '/reports/inventory-status' },
  { label: 'Employee Details', href: '/reports/employee-details' },
];

export function ReportsTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] p-4 mb-4 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
