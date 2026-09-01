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

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this transaction? This cannot be undone.")) return;
    onActionLoading(true);
    onActionError("");
    try {
      await api.patch(`/transactions/${liveTxn._id}/void`);
      onActionMessage("Transaction voided successfully");
      // Update all three status fields so UI reflects correctly
      onUpdateTransactions((prev) =>
        prev.map((t) =>
          t._id === liveTxn._id
            ? { ...t, status: "voided", orderStatus: "cancelled", paymentStatus: "voided" }
            : t
        )
      );
    } catch (err: any) {
      onActionError(err.response?.data?.message || "Failed to void. Please try again.");
    } finally {
      onActionLoading(false);
    }
  };

  const orderStatus = liveTxn.orderStatus ?? liveTxn.status;
  const paymentStatus = liveTxn.paymentStatus ?? (liveTxn.status === "success" ? "paid" : "voided");
  const items = liveTxn.items ?? [];
  const discount = liveTxn.discount ?? 0;
  const finalTotal = liveTxn.total ?? liveTxn.amount ?? 0;
  const customerName = liveTxn.customer || "Guest Customer";

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 font-sans max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#E3E6F0] flex-shrink-0">
          <div>
            <h3 className="m-0 text-[18px] font-extrabold text-[#111827]">Transaction Details</h3>
            <span className="text-[12px] font-mono text-[#065F46] font-bold">#{liveTxn.txnId}</span>
            <span className="text-[12px] text-[#9CA3AF] ml-2">({liveTxn.orderId})</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 flex-1 space-y-4 pr-1">

          {/* Customer & Info Badges */}
          <div className="bg-[#F7F8FC] rounded-xl p-3.5 border border-[#E3E6F0] text-[12px]">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[#6B7280] block text-[11px] font-medium uppercase tracking-wider mb-0.5">Customer</span>
                <span className="font-bold text-[#111827]">{customerName}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px] font-medium uppercase tracking-wider mb-0.5">Payment Method</span>
                <span className="font-bold text-[#111827]">{liveTxn.paymentMethod || "Cash"}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px] font-medium uppercase tracking-wider mb-0.5">Date & Time</span>
                <span className="font-semibold text-[#374151]">
                  {new Date(liveTxn.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}{" "}
                  · {new Date(liveTxn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[11px] font-medium uppercase tracking-wider mb-0.5">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  liveTxn.status === "voided"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {(orderStatus || "SUCCESS").toUpperCase()} · {(paymentStatus || "PAID").toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Purchased Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#6B7280]">
                Purchased Items ({items.length})
              </span>
            </div>

            {items.length === 0 ? (
              <div className="bg-[#F7F8FC] rounded-xl p-4 text-center text-[12px] text-[#6B7280] border border-[#E3E6F0]">
                No item details recorded for this transaction
              </div>
            ) : (
              <div className="border border-[#E3E6F0] rounded-xl overflow-hidden divide-y divide-[#E3E6F0]">
                <div className="bg-[#F0F2F8] px-3.5 py-2 grid grid-cols-[1fr_80px_90px_90px] text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Total</span>
                </div>

                {items.map((item, idx) => {
                  const unitPrice = item.unitPrice ?? 0;
                  const qty = item.quantity ?? 1;
                  const subtotal = item.subtotal ?? unitPrice * qty;
                  return (
                    <div key={idx} className="px-3.5 py-2.5 grid grid-cols-[1fr_80px_90px_90px] items-center bg-white text-[12px] hover:bg-gray-50/70">
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-[#111827] truncate m-0">{item.productName || "Unnamed Item"}</p>
                        {item.sku && <span className="text-[10px] text-[#9CA3AF] font-mono">{item.sku}</span>}
                      </div>
                      <div className="text-center font-bold text-[#374151]">
                        {qty}
                      </div>
                      <div className="text-right font-medium text-[#6B7280]">
                        Rs. {unitPrice.toLocaleString()}
                      </div>
                      <div className="text-right font-bold text-[#111827]">
                        Rs. {subtotal.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-[#F7F8FC] rounded-xl p-3.5 border border-[#E3E6F0] text-[12px] space-y-1.5">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal</span>
              <span className="font-medium text-[#111827]">
                Rs. {((liveTxn.subtotal ?? liveTxn.amount ?? finalTotal) ?? 0).toLocaleString()}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>Discount</span>
                <span>−Rs. {(discount ?? 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-extrabold text-[#065F46] pt-1.5 border-t border-[#E3E6F0]">
              <span>Total Paid</span>
              <span className="font-mono">Rs. {(finalTotal ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Messages */}
          {actionMessage && (
            <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-[13px] text-emerald-800 m-0 font-semibold">✓ {actionMessage}</p>
            </div>
          )}
          {actionError && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[13px] text-red-700 m-0 font-semibold">✗ {actionError}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#E3E6F0] flex gap-2 flex-shrink-0">
          {liveTxn.status === "success" && !actionMessage && (
            <button
              disabled={actionLoading}
              onClick={handleVoid}
              className="flex-1 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[13px] font-bold text-red-600 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-100 transition-colors"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              )}
              Void Transaction
            </button>
          )}

          <button
            onClick={onClose}
            className={`py-2.5 bg-gray-100 hover:bg-gray-200 border-none rounded-xl text-[13px] font-bold text-[#374151] cursor-pointer transition-colors ${
              liveTxn.status === "success" && !actionMessage ? "w-28" : "w-full"
            }`}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}