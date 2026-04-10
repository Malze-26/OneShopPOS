"use client";
import { Customer, getInitials, formatDate } from "./types";

interface CustomerListProps {
  customers: Customer[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (c: Customer) => void;
  onAdd: () => void;
}

export default function CustomerList({ customers, search, onSearch, onSelect, onAdd }: CustomerListProps) {
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E3E6F0] overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E3E6F0]">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9290C3] focus:ring-2 focus:ring-[#9290C3]/20 transition-all"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B1A55] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2D2B8F] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Customer
        </button>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_60px] py-2.5 px-6 bg-[#FAFAFA] border-b border-[#E3E6F0]">
        {["Customer", "Contact", "Orders", "Total Spent", "Last Purchase", ""].map((h) => (
          <div key={h} className="text-[12px] font-bold text-[#535C91] tracking-[0.3px]">{h}</div>
        ))}
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[#6B7280] text-[14px]">
          {customers.length === 0 ? "No customers yet" : "No customers match your search"}
        </div>
      ) : (
        filtered.map((c, i) => (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_60px] py-3.5 px-6 items-center cursor-pointer hover:bg-[#F5F4FF] transition-colors ${
              i < filtered.length - 1 ? "border-b border-[#E3E6F0]" : ""
            }`}
          >
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1B1A55] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                {getInitials(c.name)}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{c.name}</p>
                <p className="text-[11px] text-[#6B7280]">ID: {c._id.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[12px] text-[#111827]">{c.email || "—"}</p>
              <p className="text-[11px] text-[#6B7280]">{c.phone || "—"}</p>
            </div>

            {/* Orders */}
            <div className="text-[13px] font-semibold text-[#111827]">{c.totalOrders}</div>

            {/* Spent */}
            <div className="text-[13px] font-bold text-[#1B1A55]">Rs. {c.totalSpent.toLocaleString()}</div>

            {/* Last Purchase */}
            <div className="text-[12px] text-[#6B7280]">{formatDate(c.lastPurchase)}</div>

            {/* Arrow */}
            <div className="flex justify-end">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        ))
      )}
    </div>
  );
}