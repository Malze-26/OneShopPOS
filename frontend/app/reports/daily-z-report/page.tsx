import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';

const paymentBreakdown = [
  { method: 'Cash', amount: 'LKR 524,500', txCount: 72 },
  { method: 'Card', amount: 'LKR 612,000', txCount: 68 },
  { method: 'Online', amount: 'LKR 312,500', txCount: 39 },
];

export default function DailyZReportPage() {
  return (
    <div className="p-4 md:p-6 max-w-350">
      <div className="mb-4">
       <ReportsTabs />
       <ReportsDateToolbar />
      </div>

       <div className="mb-4">
       <h2 className="text-2xl font-bold text-dark">Daily Z-Report</h2>
        <p className="text-sm text-[#667085] mt-1">End-of-day POS closure summary for February 20, 2026</p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-[#98a2b3]">Gross Sales</p>
          <p className="text-2xl font-bold text-dark mt-1">LKR 1,449,000</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-[#98a2b3]">Total Transactions</p>
          <p className="text-2xl font-bold text-dark mt-1">179</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-[#98a2b3]">Refunds / Voids</p>
          <p className="text-2xl font-bold text-dark mt-1">LKR 18,500</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-4 md:p-5">
        <h3 className="text-base font-semibold text-dark mb-3">Payment Method Breakdown</h3>
        <div className="space-y-3">
          {paymentBreakdown.map((row) => (
            <div key={row.method} className="flex items-center justify-between border-b border-[#f2f4f7] pb-3 last:border-b-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-[#344054]">{row.method}</p>
                <p className="text-xs text-[#98a2b3]">{row.txCount} transactions</p>
              </div>
              <p className="text-sm font-semibold text-dark">{row.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
