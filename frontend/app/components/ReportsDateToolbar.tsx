'use client';

import { CalendarDays, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const ranges = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last-7-days' },
  { label: 'This Month', value: 'this-month' },
  { label: 'All Time', value: 'all-time' },
  { label: 'Custom', value: 'custom' }
];

export function ReportsDateToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPreset = searchParams.get('preset') || 'today';

  const handleRangeClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        {ranges.map(({ label, value }) => {
          const isActive = currentPreset === value;
          const isCustom = value === 'custom';

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleRangeClick(value)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[#e4e7ec] text-[#4a5565] bg-white hover:bg-[#f9fafb]'
                }`}
            >
              <span>{label}</span>
              {isCustom && <CalendarDays className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Export</span>
      </button>
    </div>
  );
}
