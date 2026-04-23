'use client';

import { EmployeePerf } from './types';

interface EmployeePerformanceListProps {
  employees: EmployeePerf[];
  currency: string;
}

/**
 * Displays each cashier's daily performance as a name, transaction count,
 * revenue, and a proportional background progress bar.
 * The bar width is driven by the 0–100 `performance` score.
 *
 * TODO: Wire up a real API endpoint (e.g. GET /api/employees/performance?date=today)
 *       to replace the placeholder data.
 */
export function EmployeePerformanceList({ employees, currency }: EmployeePerformanceListProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#101828]">Employee Performance</h2>
        <p className="text-xs text-[#4a5565] mt-1">Today&apos;s cashiers</p>
      </div>

      <div className="space-y-3">
        {employees.map((employee) => (
          <div key={employee.name} className="relative">
            {/* Background performance bar — rendered behind the content */}
            <div
              className="absolute inset-0 bg-[var(--color-primary-light)] rounded"
              style={{ width: `${employee.performance}%`, zIndex: 0 }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-medium">{employee.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#101828] truncate">{employee.name}</div>
                <div className="text-xs text-[#4a5565]">{employee.transactions} transactions</div>
              </div>
              <div className="text-sm font-semibold text-[#101828]">
                {currency} {employee.revenue.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
