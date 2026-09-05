import { useState } from "react";
import api from "@/app/lib/api";
import { useAuth } from "@/app/contexts/AuthContext";
import { Transaction } from "./types";
import { formatStoreDate, formatStoreTime } from "@/app/lib/timezone";

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
  const { user } = useAuth();
  const isManager = user?.role === "Manager";

  // Manager Override state for Cashiers
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [mgrEmail, setMgrEmail] = useState("");
  const [mgrPassword, setMgrPassword] = useState("");
  const [overrideError, setOverrideError] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Always read live status from transactions array
  const liveTxn = transactions.find((t) => t._id === selectedTxn._id) ?? selectedTxn;

  const executeVoid = async (credentials?: { managerEmail: string; managerPassword: string }) => {
    onActionLoading(true);
    onActionError("");
    try {
      await api.patch(`/transactions/${liveTxn._id}/void`, credentials);
      onActionMessage(
        credentials
          ? "✓ Transaction voided with Manager authorization"
          : "✓ Transaction voided successfully"
      );
      setShowOverrideModal(false);
      setMgrEmail("");
      setMgrPassword("");
      // Update all three status fields so UI reflects correctly
      onUpdateTransactions((prev) =>
        prev.map((t) =>
          t._id === liveTxn._id
            ? { ...t, status: "voided", orderStatus: "cancelled", paymentStatus: "voided" }
            : t
        )
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to void. Please check credentials and try again.";
      if (credentials) {
        setOverrideError(msg);
      } else {
        onActionError(msg);
      }
    } finally {
      onActionLoading(false);
      setOverrideLoading(false);
    }
  };

  const handleVoidClick = () => {
    if (isManager) {
      if (!confirm("Are you sure you want to void this transaction? This cannot be undone.")) return;
      executeVoid();
    } else {
      setOverrideError("");
      setShowOverrideModal(true);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrEmail.trim() || !mgrPassword) {
      setOverrideError("Please enter both manager email and password");
      return;
    }
    setOverrideLoading(true);
    setOverrideError("");
    await executeVoid({ managerEmail: mgrEmail.trim(), managerPassword: mgrPassword });
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
            <span className="text-[12px] font-mono font-bold" style={{ color: "var(--color-primary)" }}>#{liveTxn.txnId}</span>
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
                  {formatStoreDate(liveTxn.createdAt, { day: "2-digit", month: "short", year: "numeric" })}{" "}
                  · {formatStoreTime(liveTxn.createdAt, { hour: "2-digit", minute: "2-digit" })}
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
                <span>Discount {liveTxn.discountCode ? `(${liveTxn.discountCode})` : ""}</span>
                <span>−Rs. {(discount ?? 0).toLocaleString()}</span>
              </div>
            )}
            {(liveTxn.loyaltyDiscount ?? 0) > 0 && (
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>⭐ Loyalty Redeemed ({liveTxn.loyaltyPointsUsed ?? 0} pts)</span>
                <span>−Rs. {(liveTxn.loyaltyDiscount ?? 0).toLocaleString()}</span>
              </div>
            )}
            {liveTxn.customerId && liveTxn.status === "success" && (liveTxn.pointsEarned ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold text-[11px] pt-0.5">
                <span>⭐ Loyalty Points Earned</span>
                <span>+{liveTxn.pointsEarned} pts</span>
              </div>
            )}
            <div
              className="flex justify-between text-[14px] font-extrabold pt-1.5 border-t border-[#E3E6F0]"
              style={{ color: "var(--color-primary)" }}
            >
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
              onClick={handleVoidClick}
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
              {isManager ? "Void Transaction" : "Void (Manager Override)"}
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

      {/* ── Manager Override Modal Dialog ────────────────────────────────────── */}
      {showOverrideModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !overrideLoading) setShowOverrideModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 font-sans shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 text-lg font-bold">
                🔒
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-gray-900 m-0">Manager Authorization Required</h4>
                <p className="text-[12px] text-gray-500 m-0">A manager must enter their credentials to void #{liveTxn.txnId}</p>
              </div>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Manager Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={mgrEmail}
                  onChange={(e) => setMgrEmail(e.target.value)}
                  placeholder="e.g. mng01@opendoor.lk"
                  disabled={overrideLoading}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Manager Password
                </label>
                <input
                  type="password"
                  required
                  value={mgrPassword}
                  onChange={(e) => setMgrPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={overrideLoading}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                />
              </div>

              {overrideError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-[12px] text-red-700 font-semibold m-0">✗ {overrideError}</p>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={overrideLoading}
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 border-none rounded-xl text-[13px] font-bold text-gray-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {overrideLoading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Authorize & Void
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}