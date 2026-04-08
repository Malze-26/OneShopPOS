"use client";
import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Transaction {
  _id: string;
  txnId: string;
  orderId: string;
  customer: string;
  paymentMethod: "Cash" | "Card" | "Bank Transfer";
  amount: number;
  status: "success" | "pending" | "failed" | "refunded" | "voided";
  createdAt: string;
}

// ─── Payment Badge Config ───────────────────────────────────────────────────────
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
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
};

const PAYMENT_BADGE_CLASS: Record<string, string> = {
  Cash:            "bg-emerald-100 text-emerald-800",
  Card:            "bg-violet-100 text-violet-900",
  "Bank Transfer": "bg-amber-100 text-amber-800",
};

const STATUS_CIRCLE_BG: Record<string, string> = {
  success:  "fill-emerald-100",
  refunded: "fill-amber-100",
  voided:   "fill-gray-100",
  pending:  "fill-red-100",
  failed:   "fill-red-100",
};

const STATUS_CIRCLE_STROKE: Record<string, string> = {
  success:  "stroke-emerald-500",
  refunded: "stroke-amber-500",
  voided:   "stroke-gray-400",
  pending:  "stroke-red-400",
  failed:   "stroke-red-400",
};

const ITEMS_PER_PAGE = 5;

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/pos/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
        const { data } = await api.get('/transactions');
        setTransactions(data.data);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchTransactions();
  }, [user]);

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
  const todaySales = transactions.reduce((s, t) => s + t.amount, 0);
  const avgBill = transactions.length ? Math.round(todaySales / transactions.length) : 0;

  if (authLoading || loadingData) return (
    <div className="flex items-center justify-center h-screen bg-[#F0F2F8]">
      <div className="animate-spin w-10 h-10 border-4 border-[#1B1A55] border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F8] font-sans">
      <div className="max-w-[1040px] mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mb-5">
          <button
            onClick={() => router.push("/pos")}
            className="bg-transparent border-none cursor-pointer text-[#6B7280] font-sans hover:text-[#1B1A55] transition-colors"
          >
            Home
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="font-semibold text-[#111827]">Transaction History</span>
        </div>

        {/* Page Title */}
        <div className="mb-7">
          <h1 className="text-[28px] font-extrabold mb-1 text-[#111827] tracking-[-0.5px]">Transaction History</h1>
          <p className="text-[13px] text-[#6B7280]">Manage and audit your business sales performance</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-7">

          {/* Total Sales */}
          <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#1B1A55] to-[#2D2B8F] p-5 flex flex-col justify-between">
            <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
            <div className="absolute right-5 bottom-[-20px] w-[70px] h-[70px] rounded-full bg-white/10" />
            <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Total Sales</p>
            <p className="text-[28px] font-black mb-3 text-white tracking-tight font-mono">Rs. {todaySales.toLocaleString()}</p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/20 px-2.5 py-1 w-fit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
              <span className="text-[11px] font-bold text-emerald-300">{transactions.length} transactions</span>
            </div>
          </div>

          {/* Transactions Count */}
          <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#535C91] to-[#6D75C0] p-5 flex flex-col justify-between">
            <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
            <svg className="absolute right-5 bottom-5 opacity-15" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Transactions</p>
            <p className="text-[36px] font-black mb-2 text-white tracking-tight">{transactions.length}</p>
            <p className="text-[12px] font-medium text-white/60">Avg: Rs. {avgBill.toLocaleString()}</p>
          </div>

          {/* Success Rate */}
          <div className="relative overflow-hidden min-h-[130px] rounded-2xl bg-gradient-to-br from-[#9290C3] to-[#A8A6D8] p-5 flex flex-col justify-between">
            <div className="absolute right-[-10px] top-[-10px] w-[90px] h-[90px] rounded-full bg-white/5" />
            <svg className="absolute right-4 bottom-3 opacity-20" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p className="text-[11px] font-bold uppercase mb-2 text-white/70 tracking-wider">Success Rate</p>
            <p className="text-[36px] font-black mb-2 text-white tracking-tight">
              {transactions.length ? Math.round((transactions.filter(t => t.status === 'success').length / transactions.length) * 100) : 0}%
            </p>
            <p className="text-[12px] font-medium text-white/70">{transactions.filter(t => t.status === 'success').length} successful</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E3E6F0] overflow-hidden mb-5">

          {/* Search + Filter Row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E3E6F0]">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="w-full pl-9 pr-4 py-2 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9290C3] focus:ring-2 focus:ring-[#9290C3]/20 transition-all"
                placeholder="Search by transaction #, customer or order ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex gap-2">
              {["All", "Cash", "Card", "Bank Transfer"].map((f) => (
                <button
                  key={f}
                  onClick={() => { setPaymentFilter(f); setPage(1); }}
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

          {/* Table Header */}
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
                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" className={STATUS_CIRCLE_BG[t.status] ?? "fill-red-100"}/>
                    <polyline
                      points="7 12 10.5 15.5 17 9"
                      className={STATUS_CIRCLE_STROKE[t.status] ?? "stroke-red-400"}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTxn(t);
                      setShowActionModal(true);
                      setActionMessage("");
                    }}
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
              <button
                className="w-8 h-8 rounded-lg border border-[#E3E6F0] bg-white text-[13px] font-bold flex items-center justify-center text-[#6B7280] transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:border-[#9290C3] hover:text-[#1B1A55]"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg border text-[13px] font-bold flex items-center justify-center transition-all ${
                    page === p
                      ? "bg-[#1B1A55] text-white border-[#1B1A55]"
                      : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#9290C3] hover:text-[#1B1A55]"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="w-8 h-8 rounded-lg border border-[#E3E6F0] bg-white text-[13px] font-bold flex items-center justify-center text-[#6B7280] transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:border-[#9290C3] hover:text-[#1B1A55]"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => p + 1)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Summary Card */}
        <div className="bg-white rounded-2xl border border-[#E3E6F0] px-10 py-7 flex justify-center gap-20">
          <div className="text-center">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-[1.2px] mb-2">Average Bill</p>
            <p className="text-[26px] font-black text-[#111827] tracking-[-0.5px] font-mono">Rs. {avgBill.toLocaleString()}</p>
          </div>
          <div className="w-px bg-[#E3E6F0]" />
          <div className="text-center">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-[1.2px] mb-2">Total Records</p>
            <p className="text-[26px] font-black text-[#111827] tracking-[-0.5px] font-mono">{transactions.length}</p>
          </div>
        </div>

      </div>

      {/* Action Modal */}
      {showActionModal && selectedTxn && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowActionModal(false); setActionMessage(""); } }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-7 font-sans">

            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="m-0 text-[17px] font-extrabold text-[#111827]">Manage Transaction</h3>
              <button
                onClick={() => { setShowActionModal(false); setActionMessage(""); }}
                className="w-7 h-7 rounded-full bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Transaction Info */}
            <div className="bg-[#F7F8FC] rounded-xl px-4 py-3 mb-5 border border-[#E3E6F0]">
              {[
                { label: "Transaction", value: `#${selectedTxn.txnId}` },
                { label: "Customer",    value: selectedTxn.customer },
                { label: "Amount",      value: `Rs. ${selectedTxn.amount.toLocaleString()}` },
                { label: "Status",      value: selectedTxn.status.charAt(0).toUpperCase() + selectedTxn.status.slice(1) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between mb-1.5">
                  <span className="text-[12px] text-[#6B7280]">{label}</span>
                  <span className="text-[12px] font-bold text-[#111827]">{value}</span>
                </div>
              ))}
            </div>

            {/* Success Message */}
            {actionMessage && (
              <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[13px] text-emerald-800 m-0 font-semibold">✓ {actionMessage}</p>
              </div>
            )}

            {/* Actions */}
            {selectedTxn.status === 'success' && !actionMessage && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[12px] text-[#6B7280] m-0 text-center">What would you like to do with this transaction?</p>

                {/* Refund */}
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      await api.patch(`/transactions/${selectedTxn._id}/refund`);
                      setActionMessage("Transaction marked as refunded");
                      setTransactions(prev => prev.map(t => t._id === selectedTxn._id ? { ...t, status: 'refunded' } : t));
                    } catch (err: any) {
                      setActionMessage(err.response?.data?.message || "Failed to refund");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-amber-50 border border-amber-200 rounded-xl text-[14px] font-bold text-amber-800 flex items-center justify-center gap-2.5 disabled:cursor-not-allowed hover:bg-amber-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                  </svg>
                  Mark as Refunded
                </button>

                {/* Void */}
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    if (!confirm("Are you sure you want to void this transaction? This cannot be undone.")) return;
                    setActionLoading(true);
                    try {
                      await api.patch(`/transactions/${selectedTxn._id}/void`);
                      setActionMessage("Transaction voided successfully");
                      setTransactions(prev => prev.map(t => t._id === selectedTxn._id ? { ...t, status: 'voided' } : t));
                    } catch (err: any) {
                      setActionMessage(err.response?.data?.message || "Failed to void");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-red-50 border border-red-200 rounded-xl text-[14px] font-bold text-red-600 flex items-center justify-center gap-2.5 disabled:cursor-not-allowed hover:bg-red-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                  Void Transaction
                </button>
              </div>
            )}

            {/* Already refunded/voided */}
            {(selectedTxn.status === 'refunded' || selectedTxn.status === 'voided') && !actionMessage && (
              <div className="px-3 py-3 bg-gray-100 rounded-xl text-center">
                <p className="text-[13px] text-[#6B7280] m-0">
                  This transaction has already been <strong>{selectedTxn.status}</strong>.
                </p>
              </div>
            )}

            <button
              onClick={() => { setShowActionModal(false); setActionMessage(""); }}
              className="w-full mt-3.5 py-2.5 bg-transparent border border-[#E3E6F0] rounded-xl text-[13px] font-semibold text-[#6B7280] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}