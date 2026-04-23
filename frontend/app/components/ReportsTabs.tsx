'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Sales Summary', href: '/reports' },
  { label: 'Daily Z-Report', href: '/reports/daily-z-report' },
  { label: 'Sales by Product', href: '/reports/sales-by-product' },
  { label: 'Inventory Status', href: '/reports/inventory-status' },
  { label: 'Customer Activity', href: '/reports/customer-activity' },
];

export function ReportsTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-white border border-border rounded-xl p-1 mb-4 overflow-x-auto">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-[#667085] hover:bg-[#f2f4f7]'
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
