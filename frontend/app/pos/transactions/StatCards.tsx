interface StatCardsProps {
  todaySales: number;
  todayCount: number;
  totalCount: number;
  avgBill: number;
  successRate: number;
  successCount: number;
}

export default function StatCards({
  todaySales,
  todayCount,
  totalCount,
  avgBill,
  successRate,
  successCount,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-7">

      {/* Today's Sales */}
      <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#1B1A55] to-[#2D2B8F] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
        <div className="absolute right-5 bottom-[-20px] w-[70px] h-[70px] rounded-full bg-white/10" />
        <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Today's Sales</p>
        <p className="text-[28px] font-black mb-3 text-white tracking-tight font-mono">
          Rs. {todaySales.toLocaleString()}
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/20 px-2.5 py-1 w-fit">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          <span className="text-[11px] font-bold text-emerald-300">{todayCount} today</span>
        </div>
      </div>

      {/* Total Records */}
      <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#535C91] to-[#6D75C0] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
        <svg className="absolute right-5 bottom-5 opacity-15" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
        <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Total Records</p>
        <p className="text-[36px] font-black mb-2 text-white tracking-tight">{totalCount}</p>
        <p className="text-[12px] font-medium text-white/60">Avg: Rs. {avgBill.toLocaleString()}</p>
      </div>

      {/* Success Rate */}
      <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#9290C3] to-[#A8A6D8] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
        <svg className="absolute right-4 bottom-3 opacity-20" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Success Rate</p>
        <p className="text-[36px] font-black mb-2 text-white tracking-tight">{successRate}%</p>
        <p className="text-[12px] font-medium text-white/70">{successCount} successful</p>
      </div>

    </div>
  );
}