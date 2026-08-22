"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Transaction, getTodayStats } from "./types";
import StatCards from "./StatCards";
import TransactionTable from "./TransactionTable";
import ActionModal from "./ActionModal";

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/pos/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
        const { data } = await api.get("/transactions");
        setTransactions(data.data);
        setFetchError("");
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setFetchError("Failed to load transactions. Please refresh the page.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchTransactions();
  }, [user]);

  const { todaySales, todayCount, successRate, successCount, avgBill } = getTodayStats(transactions);

  const closeModal = () => {
    setShowActionModal(false);
    setActionMessage("");
    setActionError("");
  };

  if (authLoading || loadingData) return (
    <div className="flex items-center justify-center h-screen bg-[#F0F2F8]">
      <div className="animate-spin w-10 h-10 border-4 border-[#065F46] border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F8] font-sans">
      <div className="max-w-[1040px] mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mb-5">
          <button
            onClick={() => router.push("/pos/dashboard")}
            className="bg-transparent border-none cursor-pointer text-[#6B7280] font-sans hover:text-[#065F46] transition-colors"
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

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-[13px] text-red-700 font-medium">{fetchError}</p>
            <button
              onClick={() => { setFetchError(""); setLoadingData(true); }}
              className="ml-auto text-[12px] font-bold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        <StatCards
          todaySales={todaySales}
          todayCount={todayCount}
          totalCount={transactions.length}
          avgBill={avgBill}
          successRate={successRate}
          successCount={successCount}
        />

        <TransactionTable
          transactions={transactions}
          search={search}
          paymentFilter={paymentFilter}
          page={page}
          onSearch={setSearch}
          onFilter={setPaymentFilter}
          onPageChange={setPage}
          onOpenModal={(t) => {
            setSelectedTxn(t);
            setShowActionModal(true);
            setActionMessage("");
            setActionError("");
          }}
        />

        {/* Bottom Summary */}
        <div className="bg-white rounded-2xl border border-[#E3E6F0] px-10 py-7 flex justify-center gap-20">
          <div className="text-center">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-[1.2px] mb-2">Avg Successful Bill</p>
            <p className="text-[26px] font-black text-[#111827] tracking-[-0.5px] font-mono">Rs. {avgBill.toLocaleString()}</p>
          </div>
          <div className="w-px bg-[#E3E6F0]" />
          <div className="text-center">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-[1.2px] mb-2">Total Records</p>
            <p className="text-[26px] font-black text-[#111827] tracking-[-0.5px] font-mono">{transactions.length}</p>
          </div>
        </div>

      </div>

      {showActionModal && selectedTxn && (
        <ActionModal
          selectedTxn={selectedTxn}
          transactions={transactions}
          actionLoading={actionLoading}
          actionMessage={actionMessage}
          actionError={actionError}
          onClose={closeModal}
          onActionLoading={setActionLoading}
          onActionMessage={setActionMessage}
          onActionError={setActionError}
          onUpdateTransactions={setTransactions}
        />
      )}
    </div>
  );
}