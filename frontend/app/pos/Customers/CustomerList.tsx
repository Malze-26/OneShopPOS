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
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#065F46] text-white text-[13px] font-semibold rounded-xl hover:bg-[#047857] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Customer
        </button>
      </div>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_60px] py-2.5 px-6 bg-[#FAFAFA] border-b border-[#E3E6F0]">
        {["Customer", "Contact", "Orders", "Total Spent", "Loyalty Points", "Last Purchase", ""].map((h) => (
          <div key={h} className="text-[12px] font-bold text-[#065F46] tracking-[0.3px]">{h}</div>
        ))}
      </div>
      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[#6B7280] text-[14px]">
          {customers.length === 0 ? "No customers yet" : "No customers match your search"}
        </div>
      ) : (
        filtered.map((c, i) => (
          <div key={c._id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_60px] px-6 py-4 border-b border-[#E3E6F0] hover:bg-[#ECFDF5] cursor-pointer" onClick={() => onSelect(c)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ECFDF5] flex items-center justify-center font-bold text-[#065F46] text-[15px]">{getInitials(c.name)}</div>
              <div>
                <div className="font-semibold text-[#111827] text-[14px]">{c.name}</div>
                <div className="text-[#6B7280] text-[12px]">{formatDate(c.createdAt)}</div>
              </div>
            </div>
            <div className="text-[#374151] text-[13px]">{c.email || "—"}<br />{c.phone || "—"}</div>
            <div className="text-[#374151] text-[13px]">{c.totalOrders}</div>
            <div className="text-[#374151] text-[13px]">Rs. {c.totalSpent.toLocaleString()}</div>
            <div className="text-[#374151] text-[13px]">{c.loyaltyPoints}</div>
            <div className="text-[#374151] text-[13px]">{formatDate(c.lastPurchase)}</div>
            <div className="flex items-center gap-2">
              {/* Add action buttons here if needed */}
            </div>
          </div>
        ))
      )}
    </div>
  );
}