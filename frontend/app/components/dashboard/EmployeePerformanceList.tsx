'use client';

import { EmployeePerf } from './types';
import { avatarSrc } from '@/app/lib/avatarUtils';

interface EmployeePerformanceListProps {
  employees: EmployeePerf[];
}

/** Lists the employees who have logged in today — name only, no metrics. */
export function EmployeePerformanceList({ employees }: EmployeePerformanceListProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#101828]">Employee Performance</h2>
        <p className="text-xs text-[#4a5565] mt-1">Active today</p>
      </div>

      <div className="space-y-3">
        {employees.length === 0 ? (
          <p className="text-sm text-[#4a5565] text-center py-4">No employees active today</p>
        ) : (
          employees.map((employee) => (
            <div key={employee.name} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarSrc(employee.avatar)
                  ? <img src={avatarSrc(employee.avatar)} alt={employee.name} className="w-full h-full object-cover" />
                  : <span className="text-white text-xs font-medium">{employee.avatar}</span>}
              </div>
              <div className="text-sm font-medium text-[#101828] truncate">{employee.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
