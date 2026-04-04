import { useState } from "react";
import api from "@/app/lib/api";
import { savePendingTransaction } from "@/app/lib/offlineDB";
import { C } from "../constants/tokens";
import { fmt, genId } from "../constants/pos";// ─── Types ─────────────────────────────────────────────────────────────────────
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
  state, subtotal, tax, total, isOnline, onClose, onSuccess,
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
      } catch (err: any) {
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
    try {
      const receiptWindow = window.open("", "_blank", "width=700,height=900");
      if (!receiptWindow) return alert("Unable to open print window. Please allow popups.");
      const now = new Date();
      const itemsHtml = state.items.map((i) => `
        <tr>
          <td style="padding:6px 8px">${i.name} × ${i.qty}</td>
          <td style="padding:6px 8px;text-align:right">${fmt(i.price * i.qty)}</td>
        </tr>`).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt ${orderId}</title>
        <style>body{font-family:Inter,Arial,sans-serif;color:#111;margin:0;padding:24px;background:#fff}.wrap{display:flex;justify-content:center}.receipt{width:320px;border:4px solid #24106d;padding:16px}.brand{font-weight:800;color:#24106d;margin-bottom:8px}.muted{color:#6b7280;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:12px}td{font-size:13px;padding:6px 8px}@media print{body{margin:0;padding:8px}.receipt{border:none}}</style>
        </head><body><div class="wrap"><div class="receipt">
        <div class="brand">OneShop POS</div>
        <div class="muted">STORE-2025-001</div>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0"/>
        <div style="font-size:13px">Receipt: <strong>#${orderId}</strong></div>
        <div style="font-size:13px">Date: <strong>${now.toLocaleDateString()}</strong></div>
        <div style="font-size:13px">Time: <strong>${now.toLocaleTimeString()}</strong></div>
        <table><tbody>${itemsHtml}</tbody></table>
        <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:13px"><div>SUBTOTAL</div><div>${fmt(subtotal)}</div></div>
        <div style="display:flex;justify-content:space-between;font-size:13px"><div>TAX (8%)</div><div>${fmt(tax)}</div></div>
        ${state.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px"><div>DISCOUNT</div><div>-${fmt(state.discount)}</div></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;margin-top:6px"><div>TOTAL</div><div>${fmt(total)}</div></div>
        ${savedOffline ? `<div style="margin-top:8px;font-size:11px;color:#F59E0B">⚠ Saved offline - will sync when online</div>` : ""}
        </div>
        <div style="text-align:center;margin-top:12px;font-size:11px;color:#9ca3af">THANK YOU FOR CHOOSING US</div>
        </div></div></body></html>`;
      receiptWindow.document.open();
      receiptWindow.document.write(html);
      receiptWindow.document.close();
      receiptWindow.focus();
      setTimeout(() => { receiptWindow.print(); }, 600);
    } catch (err) {
      alert("Printing failed");
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        .checkout-btn { width:100%;height:52px;background:${C.brand};color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s; }
        .checkout-btn:hover:not(:disabled) { background:${C.brandMid};transform:translateY(-1px); }
        .checkout-btn:disabled { opacity:.4;cursor:not-allowed; }
        .modal-ghost-btn { background:none;border:1.5px solid ${C.border};border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;color:${C.muted};cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s; }
        .modal-ghost-btn:hover { border-color:${C.brandLight};color:${C.brand};background:#F5F4FF; }
        .pay-btn { flex:1;padding:14px 8px;border-radius:12px;border:1.5px solid ${C.border};background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${C.muted};transition:all .15s; }
        .pay-btn.active { background:${C.brand};color:#fff;border-color:${C.brand}; }
        .modal-input { width:100%;padding:10px 14px;border:1.5px solid ${C.border};border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;background:#fff;color:${C.text}; }
        .modal-input:focus { border-color:${C.brandMid}; }
        .success-check { width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto; }
      `}</style>

      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 440, overflow: "hidden", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
            {step === "success" ? (savedOffline ? "Saved Offline ⚠" : "Order Complete ✓") : "Checkout"}
          </span>
          <button onClick={step === "success" ? onSuccess : onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {step === "pay" ? (
          <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {!isOnline && (
              <div style={{ padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>You're offline. Transaction will be saved locally and synced when back online.</span>
              </div>
            )}
            <div style={{ background: C.surface2, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              {state.items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: C.muted }}>{i.name} × {i.qty}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(i.price * i.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>Tax (8%)</span><span>{fmt(tax)}</span>
                </div>
                {state.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.brand, fontWeight: 600, marginBottom: 4 }}>
                    <span>Discount</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, marginTop: 6 }}>
                  <span style={{ color: C.text }}>Total</span>
                  <span style={{ color: C.brand, fontFamily: "'DM Mono', monospace" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>Payment Method</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "cash", label: "Cash", icon: "💵" },
                  { id: "card", label: "Card", icon: "💳" },
                  { id: "transfer", label: "Transfer", icon: "🏦" },
                ].map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)} className={`pay-btn ${method === m.id ? "active" : ""}`}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {method === "cash" && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Cash Tendered</div>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="modal-input"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 15 }}
                />
                {cashAmt >= total && cashAmt > 0 && (
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: C.success }}>Change: {fmt(change)}</div>
                )}
              </div>
            )}

            <button className="checkout-btn" disabled={!canPay} onClick={confirm} style={{ marginTop: 4 }}>
              {isOnline ? `Confirm Payment · ${fmt(total)}` : `Save Offline · ${fmt(total)}`}
            </button>
          </div>
        ) : (
          <div style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className="success-check" style={{ background: savedOffline ? "#FEF3C7" : "#D1FAE5" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={savedOffline ? "#D97706" : "#10B981"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                {savedOffline ? "Saved Offline!" : "Payment Successful!"}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {savedOffline
                  ? "Will sync to database when back online"
                  : <>Order <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: C.text }}>{orderId}</span></>
                }
              </div>
            </div>
            {savedOffline && (
              <div style={{ padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, width: "100%" }}>
                <p style={{ fontSize: 12, color: "#92400E", textAlign: "center" }}>
                  📱 Transaction stored locally. It will automatically sync when your internet connection is restored.
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="modal-ghost-btn" style={{ flex: 1, justifyContent: "center" }} onClick={printReceipt}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                </svg>
                Print
              </button>
              <button className="checkout-btn" onClick={onSuccess} style={{ flex: 1 }}>
                New Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}