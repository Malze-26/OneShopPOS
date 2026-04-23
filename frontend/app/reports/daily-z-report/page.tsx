import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';

const paymentBreakdown = [
  { method: 'Cash', amount: 'LKR 524,500', txCount: 72 },
  { method: 'Card', amount: 'LKR 612,000', txCount: 68 },
  { method: 'Online', amount: 'LKR 312,500', txCount: 39 },
];

export default function DailyZReportPage() {
  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Daily Z-Report</h1>
        <p className="text-sm text-[#4a5565] mt-1">End-of-day POS closure summary for February 20, 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Gross Sales</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR 1,449,000</h3>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Total Transactions</p>
          <h3 className="text-2xl font-bold text-[#101828]">179</h3>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Refunds / Voids</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR 18,500</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">Payment Method Breakdown</h2>
          <p className="text-xs text-[#4a5565] mt-0.5">Total collected by payment type</p>
        </div>
        <div className="divide-y divide-[#e4e7ec]">
          {paymentBreakdown.map((row) => (
            <div key={row.method} className="flex items-center justify-between px-5 py-4 hover:bg-[#f9fafb] transition-colors">
              <div>
                <p className="text-sm font-medium text-[#101828]">{row.method}</p>
                <p className="text-xs text-[#4a5565] mt-0.5">{row.txCount} transactions</p>
              </div>
              <p className="text-sm font-semibold text-[#101828]">{row.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
