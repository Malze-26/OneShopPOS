import React from "react";
import { Transaction } from "./types";
import StatusIcon from "./StatusIcon";

const ITEMS_PER_PAGE = 5;

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Cash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  ),
  Card: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#535C91" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  "Bank Transfer": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
};

const PAYMENT_BADGE_CLASS: Record<string, string> = {
  Cash:            "bg-emerald-100 text-emerald-800",
  Card:            "bg-violet-100 text-violet-900",
  "Bank Transfer": "bg-amber-100 text-amber-800",
};

interface TransactionTableProps {
  transactions: Transaction[];
  search: string;
  paymentFilter: string;
  page: number;
  onSearch: (v: string) => void;
  onFilter: (f: string) => void;
  onPageChange: (p: number) => void;
  onOpenModal: (t: Transaction) => void;
}

export default function TransactionTable({
  transactions,
  search,
  paymentFilter,
  page,
  onSearch,
  onFilter,
  onPageChange,
  onOpenModal,
}: TransactionTableProps) {
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.txnId.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.orderId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = paymentFilter === "All" || t.paymentMethod === paymentFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const pageBtnClass = "w-8 h-8 rounded-lg border text-[13px] font-bold flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:border-[#9290C3] hover:text-[#1B1A55]";

  return (
    <div className="bg-white rounded-2xl border border-[#E3E6F0] overflow-hidden mb-5">

      {/* Search + Filter */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E3E6F0]">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9290C3] focus:ring-2 focus:ring-[#9290C3]/20 transition-all"
            placeholder="Search by transaction #, customer or order ID..."
            value={search}
            onChange={(e) => { onSearch(e.target.value); onPageChange(1); }}
          />
        </div>
        <div className="flex gap-2">
          {["All", "Cash", "Card", "Bank Transfer"].map((f) => (
            <button
              key={f}
              onClick={() => { onFilter(f); onPageChange(1); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                paymentFilter === f
                  ? "bg-[#1B1A55] text-white border-[#1B1A55]"
                  : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#9290C3] hover:text-[#1B1A55]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[140px_130px_180px_1fr_110px_140px_80px] py-2.5 px-6 bg-[#FAFAFA] border-b border-[#E3E6F0]">
        {["Time", "Transaction #", "Customer", "Order ID", "Total", "Payment", "Status"].map((h) => (
          <div key={h} className="text-[12px] font-bold text-[#535C91] tracking-[0.3px]">{h}</div>
        ))}
      </div>

      {/* Rows */}
      {paginated.length === 0 ? (
        <div className="py-12 px-6 text-center text-[#6B7280] text-[14px]">
          {transactions.length === 0 ? "No transactions yet" : "No transactions match your search"}
        </div>
      ) : (
        paginated.map((t, i) => (
          <div
            key={t._id}
            className={`grid grid-cols-[140px_130px_180px_1fr_110px_140px_80px] py-3.5 px-6 items-center bg-white cursor-pointer transition-colors duration-150 hover:bg-[#F5F4FF] ${
              i < paginated.length - 1 ? "border-b border-[#E3E6F0]" : ""
            }`}
          >
            <div className="text-[13px] text-[#6B7280] font-medium">
              {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-[13px] font-bold text-[#535C91]">#{t.txnId}</div>
            <div className="text-[13px] font-semibold text-[#111827]">{t.customer}</div>
            <div className="text-[13px] text-[#6B7280]">{t.orderId}</div>
            <div className="text-[13px] font-bold text-[#111827]">Rs. {t.amount.toLocaleString()}</div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${PAYMENT_BADGE_CLASS[t.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                {PAYMENT_ICONS[t.paymentMethod]}
                {t.paymentMethod}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIcon status={t.status} />
              <button
                onClick={(e) => { e.stopPropagation(); onOpenModal(t); }}
                className="text-[10px] font-bold text-[#535C91] bg-[#F0F2F8] rounded px-2 py-0.5 cursor-pointer border-none hover:bg-[#E3E6F0] transition-colors"
              >
                ···
              </button>
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between py-3.5 px-6 border-t border-[#E3E6F0]">
        <span className="text-[13px] text-[#6B7280]">
          Showing {filtered.length === 0 ? 0 : Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} transactions
        </span>
        <div className="flex items-center gap-1.5">
          <button className={`${pageBtnClass} border-[#E3E6F0] bg-white text-[#6B7280]`} disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${pageBtnClass} ${
                page === p
                  ? "bg-[#1B1A55] text-white border-[#1B1A55]"
                  : "bg-white text-[#6B7280] border-[#E3E6F0]"
              }`}
            >
              {p}
            </button>
          ))}
          <button className={`${pageBtnClass} border-[#E3E6F0] bg-white text-[#6B7280]`} disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(page + 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}