"use client"
import { CalendarDays, Download } from 'lucide-react';

import * as React from "react"
import { Calendar } from "@/app/components/ui/calendar"
const ranges = ['Today', 'Last 7 Days', 'This Month', 'Custom'];

export function ReportsDateToolbar() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex overflow-hidden rounded-md border border-border bg-white shadow-sm">
        {ranges.map((label, index) => {
          const isActive = index === 0;
          const isCustom = label === 'Custom';

          return (
            <button
              key={label}
              type="button"
              className={`inline-flex items-center gap-1.5 border-r border-border px-4 py-2 text-xs font-semibold transition-colors last:border-r-0 ${
                isActive
                  ? 'bg-surface text-dark'
                  : 'bg-white text-dark hover:bg-surface'
              }`}
            >
              <span>{label}</span>
              {isCustom ? <CalendarDays className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Export</span>
      </button>
    </div>
  );
}
