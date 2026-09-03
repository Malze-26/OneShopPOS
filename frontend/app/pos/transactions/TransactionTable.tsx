import React from "react";
import { Transaction } from "./types";
import { formatStoreDate, formatStoreTime } from "@/app/lib/timezone";

const ITEMS_PER_PAGE = 10;

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
};

const STATUS_CONFIG: Record<string, { dot: string; text: string; badge: string }> = {
  success: {
    dot:   "bg-emerald-500",
    text:  "text-emerald-700",
    badge: "bg-emerald-50 border border-emerald-200 text-emerald-700",
  },
  delivered: {
    dot:   "bg-emerald-500",
    text:  "text-emerald-700",
    badge: "bg-emerald-50 border border-emerald-200 text-emerald-700",
  },
  confirmed: {
    dot:   "bg-blue-500",
    text:  "text-blue-700",
    badge: "bg-blue-50 border border-blue-200 text-blue-700",
  },
  processing: {
    dot:   "bg-purple-500",
    text:  "text-purple-700",
    badge: "bg-purple-50 border border-purple-200 text-purple-700",
  },
  paid: {
    dot:   "bg-emerald-500",
    text:  "text-emerald-700",
    badge: "bg-emerald-50 border border-emerald-200 text-emerald-700",
  },
  pending: {
    dot:   "bg-yellow-500",
    text:  "text-yellow-700",
    badge: "bg-yellow-50 border border-yellow-200 text-yellow-700",
  },
  voided: {
    dot:   "bg-red-400",
    text:  "text-red-600",
    badge: "bg-red-50 border border-red-200 text-red-600",
  },
  cancelled: {
    dot:   "bg-red-400",
    text:  "text-red-600",
    badge: "bg-red-50 border border-red-200 text-red-600",
  },
};

function StatusBadge({ status }: { status: string }) {
  const key = (status || "").toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? {
    dot:   "bg-gray-400",
    text:  "text-gray-600",
    badge: "bg-gray-50 border border-gray-200 text-gray-600",
  };

  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

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
    const term = search.toLowerCase();
    const customer = (t.customer || "").toLowerCase();
    const txnId = (t.txnId || "").toLowerCase();
    const orderId = (t.orderId || "").toLowerCase();
    const matchesSearch = !term || txnId.includes(term) || customer.includes(term) || orderId.includes(term);
    const matchesFilter = paymentFilter === "All" || (t.paymentMethod || "").toLowerCase() === paymentFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const pageBtnClass =
    "w-8 h-8 rounded-lg border text-[13px] font-bold flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:border-[#10B981] hover:text-[#065F46]";

  const GRID = "grid grid-cols-[85px_75px_110px_1fr_125px_95px_110px_100px_100px_30px] gap-2 items-center";

  const HEADERS = [
    "Date", "Time", "Transaction #", "Customer",
    "Order ID", "Total", "Payment Method", "Order Status", "Payment Status", "",
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E3E6F0] overflow-hidden mb-5">

      {/* Search + Filter */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E3E6F0]">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            placeholder="Search by transaction #, customer or order ID..."
            value={search}
            onChange={(e) => { onSearch(e.target.value); onPageChange(1); }}
          />
        </div>
        <div className="flex gap-2">
          {["All", "Cash", "Card"].map((f) => (
            <button
              key={f}
              onClick={() => { onFilter(f); onPageChange(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                paymentFilter === f
                  ? "bg-[#065F46] text-white border-[#065F46]"
                  : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#10B981] hover:text-[#065F46]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container with horizontal scroll safety */}
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          {/* Header */}
          <div className={`${GRID} py-2.5 px-6 bg-[#FAFAFA] border-b border-[#E3E6F0]`}>
            {HEADERS.map((h, i) => (
              <div key={i} className="text-[12px] font-bold text-[#065F46] tracking-[0.3px]">{h}</div>
            ))}
          </div>

      {/* Rows */}
      {paginated.length === 0 ? (
        <div className="py-12 px-6 text-center text-[#6B7280] text-[14px]">
          {transactions.length === 0 ? "No transactions yet" : "No transactions match your search"}
        </div>
      ) : (
        paginated.map((t, i) => {
          const orderStatus   = t.orderStatus   ?? t.status;
          const paymentStatus = t.paymentStatus ?? (t.status === 'success' ? 'paid' : 'voided');
          const customerName  = t.customer || "Guest Customer";
          const finalAmount   = t.total ?? t.amount ?? 0;

          return (
            <div
              key={t._id}
              onClick={() => onOpenModal(t)}
              className={`${GRID} py-3.5 px-6 items-center bg-white cursor-pointer transition-colors duration-150 hover:bg-[#ECFDF5] ${
                i < paginated.length - 1 ? "border-b border-[#E3E6F0]" : ""
              }`}
            >
              {/* Date */}
              <div className="text-[13px] text-[#6B7280] font-medium">
                {formatStoreDate(t.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
              </div>

              {/* Time */}
              <div className="text-[13px] text-[#6B7280] font-medium">
                {formatStoreTime(t.createdAt, { hour: "2-digit", minute: "2-digit" })}
              </div>

              {/* Transaction # */}
              <div className="text-[13px] font-bold text-[#065F46]">
                #{t.txnId}
              </div>

              {/* Customer */}
              <div className="text-[13px] font-semibold text-[#111827] truncate pr-2" title={customerName}>
                {customerName}
              </div>

              {/* Order ID */}
              <div className="text-[13px] font-mono text-[#6B7280] truncate">{t.orderId}</div>

              {/* Total */}
              <div className="text-[13px] font-bold text-[#111827]">Rs. {finalAmount.toLocaleString()}</div>

              {/* Payment Method */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  (t.paymentMethod || "").toLowerCase() === "card"
                    ? "bg-violet-100 text-violet-900"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {PAYMENT_ICONS[t.paymentMethod] ?? "💳"}
                  {t.paymentMethod || "Cash"}
                </span>
              </div>

              {/* Order Status */}
              <div>
                <StatusBadge status={orderStatus} />
              </div>

              {/* Payment Status */}
              <div>
                <StatusBadge status={paymentStatus} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenModal(t); }}
                  className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] rounded px-2 py-0.5 cursor-pointer border-none hover:bg-[#D1FAE5] transition-colors"
                >
                  ···
                </button>
              </div>
            </div>
          );
        })
      )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E3E6F0] bg-[#FAFAFA]">
          <span className="text-[13px] text-[#6B7280]">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className={pageBtnClass}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`${pageBtnClass} ${
                  page === p
                    ? "bg-[#065F46] text-white border-[#065F46]"
                    : "bg-white text-[#6B7280] border-[#E3E6F0]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              className={pageBtnClass}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}