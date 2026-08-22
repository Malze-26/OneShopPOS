"use client";

import { useState, useRef } from "react";
import api from "@/app/lib/api";
import { savePendingTransaction } from "@/app/lib/offlineDB";
import { fmt, genId } from "../constants/pos";

interface CheckoutState {
  items: { id: string; name: string; sku: string; price: number; qty: number; unit: string }[];
  customer: { _id: string; name: string } | null;
  discount: number;
  discountCode: string;
  loyaltyDiscount: number;
  loyaltyPointsUsed: number;
}

interface CheckoutModalProps {
  state: CheckoutState;
  subtotal: number;
  total: number;
  isOnline: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({
  state,
  subtotal,
  total,
  isOnline,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  // Local state for payment method, cash input, checkout step, and offline save status
  const [method, setMethod] = useState("cash");
  const [cash, setCash] = useState("");
  const [step, setStep] = useState<"pay" | "success">("pay");
  const [savedOffline, setSavedOffline] = useState(false);
  const [orderId] = useState(genId);
  const receiptRef = useRef<HTMLDivElement>(null);

  const cashAmt = parseFloat(cash) || 0;
  const change = Math.max(0, cashAmt - total); // Change is only relevant for cash payments, and should not be negative
  const canPay = method !== "cash" || cashAmt >= total;

  const methodLabel =
    method === "cash" ? "Cash" : "Card";

  const handleConfirm = async () => {
    const transactionData = {
      orderId,
      customer: state.customer?.name || "Guest Customer",
      ...(state.customer?._id ? { customerId: state.customer._id } : {}),
      paymentMethod: methodLabel,
      amount: subtotal,
      discount: (state.discount ?? 0) + (state.loyaltyDiscount ?? 0),
      total,
      status: "success",
      items: state.items.map(item => ({
        product:     item.id,
        productName: item.name,
        sku:         item.sku,
        quantity:    item.qty,
        unitPrice:   item.unit === 'kg' ? item.price / item.qty : item.price,
        subtotal:    item.unit === 'kg' ? item.price : item.price * item.qty,
      })),
    };
    if (isOnline) {
      try {
        await api.post("/transactions", transactionData);
        setSavedOffline(false);
      } catch {
        await savePendingTransaction(transactionData);
        setSavedOffline(true);
      }
      setStep("success");
    } else {
      await savePendingTransaction(transactionData);
      setSavedOffline(true);
      setStep("success");
    }
  };

  const printReceipt = () => {
    const receiptContent = receiptRef.current;
    if (!receiptContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-LK", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-LK", {
      hour: "2-digit", minute: "2-digit",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #111;
            width: 300px;
            margin: 0 auto;
            padding: 16px 12px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #999; margin: 8px 0; }
          .divider-solid { border-top: 1px solid #111; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .store-name { font-size: 18px; font-weight: bold; letter-spacing: -0.5px; }
          .order-id { font-size: 11px; color: #555; margin-top: 2px; }
          .item-name { flex: 1; padding-right: 8px; }
          .item-price { text-align: right; white-space: nowrap; }
          .total-row { font-size: 15px; font-weight: bold; }
          .status-badge {
            display: inline-block;
            border: 1px solid #111;
            border-radius: 4px;
            padding: 2px 10px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-top: 6px;
          }
          .thank-you { font-size: 12px; color: #444; margin-top: 4px; }
          .offline-note {
            font-size: 10px;
            color: #888;
            margin-top: 4px;
            font-style: italic;
          }
          @media print {
            body { width: 100%; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="center" style="margin-bottom: 12px;">
          <div class="store-name">OneShop POS</div>
          <div class="order-id">${orderId}</div>
          <div style="font-size: 11px; color: #555; margin-top: 2px;">${dateStr} · ${timeStr}</div>
        </div>

        <div class="divider-solid"></div>

        <div style="margin-bottom: 4px;">
          <div class="row">
            <span style="color:#555;">Customer</span>
            <span class="bold">${state.customer?.name || "Guest Customer"}</span>
          </div>
          <div class="row">
            <span style="color:#555;">Payment</span>
            <span class="bold">${methodLabel}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div style="margin-bottom: 4px;">
          ${state.items.map(item => `
            <div class="row">
              <span class="item-name">${item.name} × ${item.qty}</span>
              <span class="item-price">${fmt(item.price * item.qty)}</span>
            </div>
          `).join("")}
        </div>

        <div class="divider"></div>

        <div style="margin-bottom: 4px;">
          <div class="row">
            <span>Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>
          
          ${state.discount > 0 ? `
          <div class="row">
            <span>Discount (${state.discountCode})</span>
            <span>−${fmt(state.discount)}</span>
          </div>` : ""}
        </div>

        <div class="divider-solid"></div>

        <div class="row total-row" style="margin-bottom: 8px;">
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        ${method === "cash" ? `
        <div class="row" style="font-size: 12px;">
          <span>Cash Tendered</span>
          <span>${fmt(cashAmt)}</span>
        </div>
        <div class="row" style="font-size: 12px;">
          <span>Change</span>
          <span>${fmt(change)}</span>
        </div>` : ""}

        <div class="divider"></div>

        <div class="center">
          <div class="status-badge">${savedOffline ? "SAVED OFFLINE" : "PAID"}</div>
          <div class="thank-you" style="margin-top: 8px;">Thank you for shopping with us!</div>
          ${savedOffline ? `<div class="offline-note">* Syncs to server when online</div>` : ""}
          <div style="font-size: 10px; color: #aaa; margin-top: 12px;">— OneShop POS v1.0 —</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // slight delay so styles load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
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

            {/* Customer badge */}
            {state.customer && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#F0F2F8] rounded-xl border border-[#E3E6F0]">
                <div className="w-6 h-6 rounded-full bg-[#065F46] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
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
                {state.discount > 0 && (
                  <div className="flex justify-between mb-1 text-amber-600 font-semibold">
                    <span>Discount</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                {state.loyaltyDiscount > 0 && (
                  <div className="flex justify-between mb-1 text-amber-600 font-semibold">
                    <span>⭐ Loyalty ({state.loyaltyPointsUsed} pts)</span>
                    <span>−{fmt(state.loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-1 text-[#065F46] font-bold text-[15px]">
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
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[12px] font-semibold rounded-xl border transition-all ${
                      method === m.id
                        ? "bg-[#065F46] text-white border-[#065F46]"
                        : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#10B981] hover:text-[#065F46]"
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
                  className="w-full px-4 py-2.5 border border-[#E3E6F0] rounded-xl text-[#111827] font-mono text-[14px] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
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
              className="w-full py-3 font-bold text-white rounded-xl bg-[#065F46] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isOnline ? `Confirm Payment · ${fmt(total)}` : `Save Offline · ${fmt(total)}`}
            </button>
          </div>
        ) : (
          // ── Success Step ───────────────────────────────────────────────────
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
                  : <><span className="font-mono font-semibold">{orderId}</span> · {methodLabel}</>
                }
              </div>
              {state.customer && (
                <div className="mt-2 text-[12px] text-[#065F46] font-semibold">
                  Linked to {state.customer.name}
                </div>
              )}
            </div>

            {savedOffline && (
              <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[12px] text-center">
                📱 Transaction stored locally. Will auto-sync when online.
              </div>
            )}

            {/* Receipt Preview (hidden, used for printing) */}
            <div ref={receiptRef} style={{ display: "none" }} />

            {/* Quick receipt summary (visible) */}
            <div className="w-full bg-[#F7F8FC] rounded-xl border border-[#E3E6F0] p-4 text-[12px]">
              <div className="text-center font-bold text-[#065F46] mb-3 text-[13px]">OneShop POS</div>
              {state.items.map(item => (
                <div key={item.id} className="flex justify-between text-[#6B7280] mb-1">
                  <span>{item.name} × {item.qty}</span>
                  <span>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-[#E3E6F0] mt-2 pt-2">
                <div className="flex justify-between text-[#6B7280] mb-1"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {state.discount > 0 && (
                  <div className="flex justify-between text-amber-600 mb-1 font-semibold">
                    <span>Discount</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#065F46] text-[13px] mt-1 pt-1 border-t border-[#E3E6F0]">
                  <span>TOTAL</span><span>{fmt(total)}</span>
                </div>
                {method === "cash" && cashAmt > 0 && (
                  <>
                    <div className="flex justify-between text-[#6B7280] mt-1"><span>Cash</span><span>{fmt(cashAmt)}</span></div>
                    <div className="flex justify-between text-emerald-600 font-semibold"><span>Change</span><span>{fmt(change)}</span></div>
                  </>
                )}
              </div>
              <div className="text-center text-[10px] text-[#9CA3AF] mt-3">
                {new Date().toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })} · {methodLabel}
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <button
                className="flex-1 py-2.5 border border-[#E3E6F0] rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
                onClick={printReceipt}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Receipt
              </button>
              <button
                className="flex-1 py-3 font-bold text-white rounded-xl bg-[#065F46] hover:bg-[#047857] transition-colors"
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