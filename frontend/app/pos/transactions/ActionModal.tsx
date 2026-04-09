import api from "@/app/lib/api";
import { Transaction } from "./types";

interface ActionModalProps {
  selectedTxn: Transaction;
  transactions: Transaction[];
  actionLoading: boolean;
  actionMessage: string;
  actionError: string;
  onClose: () => void;
  onActionLoading: (v: boolean) => void;
  onActionMessage: (v: string) => void;
  onActionError: (v: string) => void;
  onUpdateTransactions: (fn: (prev: Transaction[]) => Transaction[]) => void;
}

export default function ActionModal({
  selectedTxn,
  transactions,
  actionLoading,
  actionMessage,
  actionError,
  onClose,
  onActionLoading,
  onActionMessage,
  onActionError,
  onUpdateTransactions,
}: ActionModalProps) {
  // Always read live status from transactions array
  const liveTxn = transactions.find((t) => t._id === selectedTxn._id) ?? selectedTxn;

  const handleRefund = async () => {
    onActionLoading(true);
    onActionError("");
    try {
      await api.patch(`/transactions/${liveTxn._id}/refund`);
      onActionMessage("Transaction marked as refunded");
      onUpdateTransactions((prev) =>
        prev.map((t) => t._id === liveTxn._id ? { ...t, status: "refunded" } : t)
      );
    } catch (err: any) {
      onActionError(err.response?.data?.message || "Failed to refund. Please try again.");
    } finally {
      onActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this transaction? This cannot be undone.")) return;
    onActionLoading(true);
    onActionError("");
    try {
      await api.patch(`/transactions/${liveTxn._id}/void`);
      onActionMessage("Transaction voided successfully");
      onUpdateTransactions((prev) =>
        prev.map((t) => t._id === liveTxn._id ? { ...t, status: "voided" } : t)
      );
    } catch (err: any) {
      onActionError(err.response?.data?.message || "Failed to void. Please try again.");
    } finally {
      onActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-7 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="m-0 text-[17px] font-extrabold text-[#111827]">Manage Transaction</h3>
          <button
            onClick={onClose}
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
            { label: "Transaction", value: `#${liveTxn.txnId}` },
            { label: "Customer",    value: liveTxn.customer },
            { label: "Amount",      value: `Rs. ${liveTxn.amount.toLocaleString()}` },
            { label: "Status",      value: liveTxn.status.charAt(0).toUpperCase() + liveTxn.status.slice(1) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between mb-1.5">
              <span className="text-[12px] text-[#6B7280]">{label}</span>
              <span className="text-[12px] font-bold text-[#111827]">{value}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        {actionMessage && (
          <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-[13px] text-emerald-800 m-0 font-semibold">✓ {actionMessage}</p>
          </div>
        )}
        {actionError && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[13px] text-red-700 m-0 font-semibold">✗ {actionError}</p>
          </div>
        )}

        {/* Actions for success status */}
        {liveTxn.status === "success" && !actionMessage && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12px] text-[#6B7280] m-0 text-center">What would you like to do with this transaction?</p>

            <button
              disabled={actionLoading}
              onClick={handleRefund}
              className="w-full py-3 bg-amber-50 border border-amber-200 rounded-xl text-[14px] font-bold text-amber-800 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-amber-100 transition-colors"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-amber-800/40 border-t-amber-800 rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
              )}
              Mark as Refunded
            </button>

            <button
              disabled={actionLoading}
              onClick={handleVoid}
              className="w-full py-3 bg-red-50 border border-red-200 rounded-xl text-[14px] font-bold text-red-600 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-100 transition-colors"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              )}
              Void Transaction
            </button>
          </div>
        )}

        {/* Status messages for non-actionable states */}
        {(liveTxn.status === "refunded" || liveTxn.status === "voided") && !actionMessage && (
          <div className="px-3 py-3 bg-gray-100 rounded-xl text-center">
            <p className="text-[13px] text-[#6B7280] m-0">
              This transaction has already been <strong>{liveTxn.status}</strong>.
            </p>
          </div>
        )}
        {liveTxn.status === "failed" && !actionMessage && (
          <div className="px-3 py-3 bg-red-50 border border-red-100 rounded-xl text-center">
            <p className="text-[13px] text-red-600 m-0">
              This transaction <strong>failed</strong> and cannot be modified.
            </p>
          </div>
        )}
        {liveTxn.status === "pending" && !actionMessage && (
          <div className="px-3 py-3 bg-yellow-50 border border-yellow-100 rounded-xl text-center">
            <p className="text-[13px] text-yellow-700 m-0">
              This transaction is still <strong>pending</strong>.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3.5 py-2.5 bg-transparent border border-[#E3E6F0] rounded-xl text-[13px] font-semibold text-[#6B7280] cursor-pointer hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}