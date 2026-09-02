"use client";
import { CustomerStats } from "./types";

export default function CustomerStatCards({ stats }: { stats: CustomerStats }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-7">
      <div
        className="relative overflow-hidden min-h-[110px] rounded-2xl p-5 flex flex-col justify-between shadow-sm"
        style={{
          background: "linear-gradient(135deg, var(--color-primary, #155dfc), var(--color-primary-dark, #0d4dd9))"
        }}
      >
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/10" />
        <p className="text-[11px] font-bold uppercase text-white/80 tracking-wider">Total Customers</p>
        <div>
          <p className="text-[32px] font-black text-white tracking-tight">{stats.totalCustomers}</p>
          <p className="text-[11px] text-white/70">{stats.newThisMonth} new this month</p>
        </div>
      </div>
      <div
        className="relative overflow-hidden min-h-[110px] rounded-2xl p-5 flex flex-col justify-between shadow-sm"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #155dfc) 90%, #10b981), #10b981)"
        }}
      >
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/10" />
        <p className="text-[11px] font-bold uppercase text-white/80 tracking-wider">Avg Spend</p>
        <div>
          <p className="text-[26px] font-black text-white tracking-tight font-mono">Rs. {stats.avgSpend.toLocaleString()}</p>
          <p className="text-[11px] text-white/70">per customer</p>
        </div>
      </div>
      <div
        className="relative overflow-hidden min-h-[110px] rounded-2xl p-5 flex flex-col justify-between shadow-sm"
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)"
        }}
      >
        <div className="absolute right-[-10px] top-[-10px] w-[80px] h-[80px] rounded-full bg-white/10" />
        <p className="text-[11px] font-bold uppercase text-white/80 tracking-wider">New This Month</p>
        <div>
          <p className="text-[32px] font-black text-white tracking-tight">{stats.newThisMonth}</p>
          <p className="text-[11px] text-white/70">customers joined</p>
        </div>
      </div>
    </div>
  );
}