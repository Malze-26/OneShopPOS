'use client';

import { CalendarDays, Download, X, Check } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const ranges = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last-7-days' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Custom', value: 'custom' }
];

interface ReportsDateToolbarProps {
  onExport?: () => void;
}

export function ReportsDateToolbar({ onExport }: ReportsDateToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPreset = searchParams.get('preset') || 'today';

  const [showPicker, setShowPicker] = useState(false);
  const [tempStart, setTempStart] = useState(searchParams.get('startDate') || '');
  const [tempEnd, setTempEnd] = useState(searchParams.get('endDate') || '');

  // Close picker if preset changes to something else
  useEffect(() => {
    if (currentPreset !== 'custom') setShowPicker(false);
  }, [currentPreset]);

  const handleRangeClick = (value: string) => {
    if (value === 'custom') {
      setShowPicker(!showPicker);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', value);
    params.delete('startDate');
    params.delete('endDate');
    router.push(`${pathname}?${params.toString()}`);
    setShowPicker(false);
  };

  const applyCustomRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', 'custom');
    if (tempStart) params.set('startDate', tempStart);
    if (tempEnd) params.set('endDate', tempEnd);
    router.push(`${pathname}?${params.toString()}`);
    setShowPicker(false);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 relative">
      <div className="flex gap-2 items-center">
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

        {/* Selected custom range label */}
        {currentPreset === 'custom' && tempStart && tempEnd && !showPicker && (
          <span className="text-xs font-medium text-[#4a5565] bg-[#f2f4f7] px-3 py-1.5 rounded-full border border-[#e4e7ec]">
            {tempStart} to {tempEnd}
          </span>
        )}
      </div>

      {/* Date Picker Popover */}
      {showPicker && (
        <div className="absolute top-12 left-0 z-50 bg-white p-4 rounded-xl shadow-xl border border-[#e4e7ec] w-72 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-[#101828]">Select Range</h3>
            <button onClick={() => setShowPicker(false)} className="text-[#667085] hover:text-[#101828]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#475467] mb-1">Start Date</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full px-3 py-2 border border-[#d0d5dd] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475467] mb-1">End Date</label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full px-3 py-2 border border-[#d0d5dd] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
          </div>

          <button
            onClick={applyCustomRange}
            disabled={!tempStart || !tempEnd}
            className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Apply Range
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Export</span>
      </button>
    </div>
  );
}
