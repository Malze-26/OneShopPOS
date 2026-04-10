"use client";

import { useState } from "react";
import api from "@/app/lib/api";
import { savePendingTransaction } from "@/app/lib/offlineDB";
import { fmt, genId } from "../constants/pos";

interface CheckoutState {
  items: { id: string; name: string; price: number; qty: number; unit: string }[];
  // ✅ customer now includes _id for linking
  customer: { _id: string; name: string } | null;
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

  const handleConfirm = async () => {
    const transactionData = {
      orderId,
      customer: state.customer?.name || "Guest Customer",
      // ✅ include customerId when a real customer is selected
      ...(state.customer?._id ? { customerId: state.customer._id } : {}),
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
    // keep your existing printReceipt logic here
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-[440px] overflow-hidden font-sans">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#E3E6F0]">
          <span className="font-bold text-[#111827]">
            {step === "success" ? (savedOffline ? "Saved Offline ⚠" : "Order Complete ✓") : "Checkout"}
          </span>
          <button
            onClick={step === "success" ? onSuccess : onClose}
            className="w-7 h-7 rounded-full bg-[#F0F2F8] flex items-center justify-center text-[#6B7280] hover:bg-[#E3E6F0] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {step === "pay" ? (
          <div className="flex flex-col gap-4 p-5">

            {/* Offline warning */}
            {!isOnline && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[13px]">
                ⚠️ You're offline. Transaction will be saved locally and synced when back online.
              </div>
            )}

            {/* Customer badge — shows who this sale is linked to */}
            {state.customer && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#F0F2F8] rounded-xl border border-[#E3E6F0]">
                <div className="w-6 h-6 rounded-full bg-[#1B1A55] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {state.customer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <span className="text-[12px] font-semibold text-[#111827]">{state.customer.name}</span>
                <span className="text-[11px] text-[#6B7280] ml-auto">Linked ✓</span>
              </div>
            )}

            {/* Items */}
            <div className="bg-[#F7F8FC] rounded-xl p-3 border border-[#E3E6F0]">
              {state.items.map((i) => (
                <div key={i.id} className="flex justify-between text-[#6B7280] text-[13px] mb-1.5">
                  <span>{i.name} × {i.qty}</span>
                  <span className="font-bold">{fmt(i.price * i.qty)}</span>
                </div>
              ))}
              <div className="border-t border-[#E3E6F0] mt-2 pt-2 text-[13px]">
                <div className="flex justify-between mb-1 text-[#6B7280]"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between mb-1 text-[#6B7280]"><span>Tax (8%)</span><span>{fmt(tax)}</span></div>
                {state.discount > 0 && (
                  <div className="flex justify-between mb-1 text-amber-600 font-semibold">
                    <span>Discount</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-1 text-[#1B1A55] font-bold text-[15px]">
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <div className="text-[#6B7280] font-bold uppercase text-[11px] mb-2">Payment Method</div>
              <div className="flex gap-2">
                {[
                  { id: "cash",     label: "Cash",          icon: "💵" },
                  { id: "card",     label: "Card",          icon: "💳" },
                  { id: "transfer", label: "Bank Transfer", icon: "🏦" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[12px] font-semibold rounded-xl border transition-all ${
                      method === m.id
                        ? "bg-[#1B1A55] text-white border-[#1B1A55]"
                        : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#9290C3]"
                    }`}
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
                <div className="text-[#6B7280] font-bold uppercase text-[11px] mb-1.5">Cash Tendered</div>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full px-4 py-2.5 border border-[#E3E6F0] rounded-xl text-[#111827] font-mono text-[14px] outline-none focus:border-[#9290C3] focus:ring-2 focus:ring-[#9290C3]/20 transition-all"
                />
                {cashAmt >= total && cashAmt > 0 && (
                  <div className="mt-1.5 text-emerald-600 font-bold text-[13px]">
                    Change: {fmt(change)}
                  </div>
                )}
              </div>
            )}

            <button
              disabled={!canPay}
              onClick={handleConfirm}
              className="w-full py-3 font-bold text-white rounded-xl bg-[#1B1A55] hover:bg-[#2D2B8F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isOnline ? `Confirm Payment · ${fmt(total)}` : `Save Offline · ${fmt(total)}`}
            </button>
          </div>
        ) : (
          // Success step
          <div className="flex flex-col items-center gap-4 p-7">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${savedOffline ? "bg-yellow-100" : "bg-emerald-100"}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={savedOffline ? "#D97706" : "#10B981"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="font-bold text-[17px] text-[#111827] mb-1">
                {savedOffline ? "Saved Offline!" : "Payment Successful!"}
              </div>
              <div className="text-[12px] text-[#6B7280]">
                {savedOffline
                  ? "Will sync to database when back online"
                  : <>Order <span className="font-mono font-semibold">{orderId}</span></>
                }
              </div>
              {/* ✅ Show which customer this was linked to */}
              {state.customer && (
                <div className="mt-2 text-[12px] text-[#535C91] font-semibold">
                  Linked to {state.customer.name}
                </div>
              )}
            </div>
            {savedOffline && (
              <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[12px] text-center">
                📱 Transaction stored locally. It will automatically sync when your internet connection is restored.
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 py-2.5 border border-[#E3E6F0] rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
                onClick={printReceipt}
              >
                Print
              </button>
              <button
                className="flex-1 py-3 font-bold text-white rounded-xl bg-[#1B1A55] hover:bg-[#2D2B8F] transition-colors"
                onClick={onSuccess}
              >
                New Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}