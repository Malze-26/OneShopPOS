"use client";
import { CustomerStats } from "./types";

export default function CustomerStatCards({ stats }: { stats: CustomerStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-7">

      <div className="relative overflow-hidden min-h-[110px] rounded-2xl bg-gradient-to-br from-[#1B1A55] to-[#2D2B8F] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/5" />
        <p className="text-[11px] font-bold uppercase text-white/70 tracking-wider">Total Customers</p>
        <div>
          <p className="text-[32px] font-black text-white tracking-tight">{stats.totalCustomers}</p>
          <p className="text-[11px] text-white/50">{stats.newThisMonth} new this month</p>
        </div>
      </div>

      <div className="relative overflow-hidden min-h-[110px] rounded-2xl bg-gradient-to-br from-[#535C91] to-[#6D75C0] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/5" />
        <p className="text-[11px] font-bold uppercase text-white/70 tracking-wider">Total Revenue</p>
        <div>
          <p className="text-[26px] font-black text-white tracking-tight font-mono">Rs. {stats.totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-white/50">from all customers</p>
        </div>
      </div>

      <div className="relative overflow-hidden min-h-[110px] rounded-2xl bg-gradient-to-br from-[#9290C3] to-[#A8A6D8] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/5" />
        <p className="text-[11px] font-bold uppercase text-white/70 tracking-wider">Avg Spend</p>
        <div>
          <p className="text-[26px] font-black text-white tracking-tight font-mono">Rs. {stats.avgSpend.toLocaleString()}</p>
          <p className="text-[11px] text-white/50">per customer</p>
        </div>
      </div>

      <div className="relative overflow-hidden min-h-[110px] rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-5 flex flex-col justify-between">
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/5" />
        <p className="text-[11px] font-bold uppercase text-white/70 tracking-wider">New This Month</p>
        <div>
          <p className="text-[32px] font-black text-white tracking-tight">{stats.newThisMonth}</p>
          <p className="text-[11px] text-white/50">customers joined</p>
        </div>
      </div>

    </div>
  );
}