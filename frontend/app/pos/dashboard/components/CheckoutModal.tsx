"use client";

import { useState } from "react";
import api from "@/app/lib/api";
import { savePendingTransaction } from "@/app/lib/offlineDB";
import { fmt, genId } from "../constants/pos";

interface CheckoutState {
  items: { id: string; name: string; price: number; qty: number; unit: string }[];
  customer: { name: string } | null;
  discount: number;
  discountCode: string;
}

interface CheckoutModalProps {
  state: CheckoutState;
  subtotal: number;
  tax: number;
  total: number;
  isOnline: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({
  state,
  subtotal,
  tax,
  total,
  isOnline,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [method, setMethod] = useState("cash");
  const [cash, setCash] = useState("");
  const [step, setStep] = useState<"pay" | "success">("pay");
  const [savedOffline, setSavedOffline] = useState(false);
  const [orderId] = useState(genId);

  const cashAmt = parseFloat(cash) || 0;
  const change = Math.max(0, cashAmt - total);
  const canPay = method !== "cash" || cashAmt >= total;

  const confirm = async () => {
    const transactionData = {
      orderId,
      customer: state.customer?.name || "Guest Customer",
      paymentMethod: method === "cash" ? "Cash" : method === "card" ? "Card" : "Bank Transfer",
      amount: total,
      status: "success",
    };

    if (isOnline) {
      try {
        await api.post("/transactions", transactionData);
        setSavedOffline(false);
        setStep("success");
      } catch {
        await savePendingTransaction(transactionData);
        setSavedOffline(true);
        setStep("success");
      }
    } else {
      await savePendingTransaction(transactionData);
      setSavedOffline(true);
      setStep("success");
    }
  };

  const printReceipt = () => {
    // ...keep same as your current printReceipt
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-[var(--color-white)] rounded-[var(--radius-lg)] w-full max-w-[440px] overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--color-border)]">
          <span className="font-bold text-[var(--color-dark)]">
            {step === "success" ? (savedOffline ? "Saved Offline ⚠" : "Order Complete ✓") : "Checkout"}
          </span>
          <button
            onClick={step === "success" ? onSuccess : onClose}
            className="w-7 h-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-secondary)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {step === "pay" ? (
          <div className="flex flex-col gap-4 p-5">
            {!isOnline && (
              <div className="flex items-center gap-2 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                ⚠️ You're offline. Transaction will be saved locally and synced when back online.
              </div>
            )}

            {/* Items List */}
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-md)] p-3 border border-[var(--color-border)]">
              {state.items.map((i) => (
                <div key={i.id} className="flex justify-between text-[var(--color-secondary)] text-sm mb-1.5">
                  <span>{i.name} × {i.qty}</span>
                  <span className="font-bold">{fmt(i.price * i.qty)}</span>
                </div>
              ))}

              <div className="border-t border-[var(--color-border)] mt-2 pt-2 text-[var(--color-secondary)] text-sm">
                <div className="flex justify-between mb-1"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between mb-1"><span>Tax (8%)</span><span>{fmt(tax)}</span></div>
                {state.discount > 0 && (
                  <div className="flex justify-between mb-1 text-[var(--color-warning)] font-semibold">
                    <span>Discount</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-1 text-[var(--color-brand)] font-bold text-base">
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <div className="text-[var(--color-secondary)] font-bold uppercase text-xs mb-2">Payment Method</div>
              <div className="flex gap-2">
                {[
                  { id: "cash", label: "Cash", icon: "💵" },
                  { id: "card", label: "Card", icon: "💳" },
                  { id: "transfer", label: "Transfer", icon: "🏦" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] ${method === m.id ? "bg-[var(--color-primary)] text-[var(--color-white)] border-[var(--color-primary)]" : "text-[var(--color-secondary)]"}`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input */}
            {method === "cash" && (
              <div>
                <div className="text-[var(--color-secondary)] font-bold uppercase text-[10px] mb-1">Cash Tendered</div>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-dark)] font-mono"
                />
                {cashAmt >= total && cashAmt > 0 && (
                  <div className="mt-1 text-[var(--color-success)] font-bold text-sm">
                    Change: {fmt(change)}
                  </div>
                )}
              </div>
            )}

            <button
              disabled={!canPay}
              onClick={confirm}
              className="w-full py-3 font-bold text-white rounded-[var(--radius-lg)] bg-[var(--color-primary)] disabled:opacity-40"
            >
              {isOnline ? `Confirm Payment · ${fmt(total)}` : `Save Offline · ${fmt(total)}`}
            </button>
          </div>
        ) : (
          // Success Step (keep mostly same)
          <div className="flex flex-col items-center gap-4 p-7">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${savedOffline ? "bg-yellow-100" : "bg-green-100"}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={savedOffline ? "#D97706" : "#10B981"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-[var(--color-dark)] mb-1">{savedOffline ? "Saved Offline!" : "Payment Successful!"}</div>
              <div className="text-xs text-[var(--color-secondary)]">
                {savedOffline ? "Will sync to database when back online" : <>Order <span className="font-mono font-semibold">{orderId}</span></>}
              </div>
            </div>
            {savedOffline && (
              <div className="w-full p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-xs text-center">
                📱 Transaction stored locally. It will automatically sync when your internet connection is restored.
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button className="flex-1 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] flex items-center justify-center gap-1 text-xs font-semibold" onClick={printReceipt}>
                Print
              </button>
              <button className="flex-1 py-3 font-bold text-white rounded-[var(--radius-lg)] bg-[var(--color-primary)]" onClick={onSuccess}>
                New Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}