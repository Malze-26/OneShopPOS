"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { savePendingTransaction, getPendingCount } from "@/app/lib/offlineDB";
import { syncPendingTransactions } from "@/app/lib/syncManager";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:      "#1B1A55",
  brandMid:   "#535C91",
  brandLight: "#9290C3",
  accent:     "#F4A261",
  bg:         "#F0F2F8",
  surface:    "#FFFFFF",
  surface2:   "#F7F8FC",
  border:     "#E3E6F0",
  text:       "#111827",
  muted:      "#6B7280",
  success:    "#10B981",
  danger:     "#EF4444",
};

const CARD_GRADIENTS = [
  ["#E0E7FF","#C7D2FE"], ["#EDE9FE","#DDD6FE"], ["#DBEAFE","#BFDBFE"],
  ["#CFFAFE","#A5F3FC"], ["#D1FAE5","#A7F3D0"], ["#FEF3C7","#FDE68A"],
  ["#FFE4E6","#FECDD3"], ["#F3E8FF","#E9D5FF"],
];

const fmt = (n: number) => `Rs. ${Math.abs(n).toFixed(2)}`;
const genId = () => "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const TAX_RATE = 0.08;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  category: string;
  stock: number;
  status: string;
  lowStockThreshold: number;
  isWeightBased: boolean;
  unit: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
}

// ─── Checkout Modal ────────────────────────────────────────────────────────────
function CheckoutModal({
  state,
  subtotal,
  tax,
  total,
  isOnline,
  onClose,
  onSuccess,
}: {
  state: { items: any[]; customer: any; discount: number; discountCode: string };
  subtotal: number;
  tax: number;
  total: number;
  isOnline: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
        console.error(err);
        // If online request fails, save offline
        await savePendingTransaction(transactionData);
        setSavedOffline(true);
        setStep("success");
      }
    } else {
      // Save offline
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
        {/* Header */}
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
            {/* Offline warning */}
            {!isOnline && (
              <div style={{ padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>You're offline. Transaction will be saved locally and synced when back online.</span>
              </div>
            )}

            {/* Order summary */}
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

            {/* Payment Method */}
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

            {/* Cash tendered */}
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
          /* Success */
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

// ─── POS Dashboard ─────────────────────────────────────────────────────────────
export default function POSDashboard() {
  
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();

  const [activeCategory, setActiveCategory] = useState("All");
const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; unit: string; weight: number | null; }[]>([]);
  const [search, setSearch] = useState("");
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [customerSearch, setCustomerSearch] = useState("");
const [customers, setCustomers] = useState<Customer[]>([]);
const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);  const [showMenu, setShowMenu] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [showCheckout, setShowCheckout] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
const [showPromo, setShowPromo] = useState(false);
const [promoInput, setPromoInput] = useState("");
const [promoLoading, setPromoLoading] = useState(false);
const [promoError, setPromoError] = useState("");
const [promoSuccess, setPromoSuccess] = useState("");
const [promoCode, setPromoCode] = useState("");
const [showWeightModal, setShowWeightModal] = useState(false);
const [weightProduct, setWeightProduct] = useState<Product | null>(null);
const [weightInput, setWeightInput] = useState("");
const [weightError, setWeightError] = useState("");

useEffect(() => {
  const handleClickOutside = () => setShowCustomerDropdown(false);
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);

useEffect(() => {
  if (cart.length === 0) {
    setDiscount(0);
    setPromoCode("");
  }
}, [cart]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push("/pos/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
  try {
    const [productsRes, categoriesRes, customersRes] = await Promise.all([
      api.get('/products'),
      api.get('/categories'),
      api.get('/customers'),
    ]);
    console.log('Products data:', productsRes.data);
    console.log('Categories data:', categoriesRes.data);
    setProducts(productsRes.data.data);
    setCategories(categoriesRes.data.data);
    setCustomers(customersRes.data.data);
  } catch (err) {
    console.error('Failed to fetch data:', err);
  } finally {
    setLoadingData(false);
  }
};
    fetchData();
  }, [user]);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Auto sync when back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      const { synced, failed } = await syncPendingTransactions();
      await refreshPendingCount();
      if (synced > 0) setSyncMessage(`✓ ${synced} transaction${synced > 1 ? 's' : ''} synced!`);
      if (failed > 0) setSyncMessage(`⚠ ${failed} failed to sync`);
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (err) {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/pos/login");
  };

const subtotal = cart.reduce((acc, item) => {
  if (item.unit === 'kg') return acc + item.price;
  return acc + item.price * item.qty;
}, 0);
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax - discount).toFixed(2));

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (product: Product) => {
  if (product.stock === 0) return;
  
  if (product.isWeightBased) {
    // Show weight input modal
    setWeightProduct(product);
    setWeightInput("");
    setWeightError("");
    setShowWeightModal(true);
    return;
  }

  setCart((prev) => {
    const existing = prev.find((i) => i.id === product._id);
    if (existing) return prev.map((i) => i.id === product._id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: product._id, name: product.name, price: product.sellingPrice, qty: 1, unit: 'item', weight: null }];
  });
  setAddedId(product._id);
  setTimeout(() => setAddedId(null), 350);
};

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  };

  const handleCheckoutSuccess = () => {
  setCart([]);
  setSelectedCustomer(null);
  setCustomerSearch("");
  setDiscount(0);
  setPromoCode("");
  setShowCheckout(false);
  refreshPendingCount();
};

 const checkoutState = {
  items: cart,
  customer: selectedCustomer,
  discount,
  discountCode: promoCode,
};

  if (authLoading || loadingData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${C.brand}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: C.muted, fontFamily: "system-ui" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:4px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .prod-card { transition:transform .15s,box-shadow .15s,border-color .15s; cursor:pointer; }
        .prod-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(27,26,85,.12); border-color:#9290C3 !important; }
        .prod-card:active { transform:scale(.96); }
        .prod-card.pop { animation:pop .3s ease-out; }
        .qty-btn { width:28px;height:28px;border-radius:8px;border:1.5px solid ${C.border};background:#fff;cursor:pointer;font-size:15px;font-weight:700;color:${C.muted};display:flex;align-items:center;justify-content:center;transition:all .12s;line-height:1; }
        .qty-btn:hover { background:${C.brand};color:#fff;border-color:${C.brand}; }
        .qty-btn:active { transform:scale(.88); }
        .cat-pill { padding:6px 16px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s;white-space:nowrap;font-family:inherit; }
        .cat-pill.active { background:${C.brand};color:#fff; }
        .cat-pill.inactive { background:#fff;color:${C.muted};border-color:${C.border}; }
        .cat-pill.inactive:hover { border-color:${C.brandLight};color:${C.brand}; }
        .main-checkout-btn { width:100%;height:52px;background:${C.brand};color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;letter-spacing:.2px;font-family:inherit; }
        .main-checkout-btn:hover:not(:disabled) { background:${C.brandMid};transform:translateY(-1px);box-shadow:0 6px 20px rgba(27,26,85,.25); }
        .main-checkout-btn:active:not(:disabled) { transform:scale(.98); }
        .main-checkout-btn:disabled { opacity:.4;cursor:not-allowed; }
        .ghost-btn { background:none;border:1.5px solid ${C.border};border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;color:${C.muted};cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;font-family:inherit; }
        .ghost-btn:hover { border-color:${C.brandLight};color:${C.brand};background:#F5F4FF; }
        .cart-item { display:flex;align-items:center;gap:10px;padding:10px 12px;background:${C.surface2};border:1px solid ${C.border};border-radius:12px;animation:fadeIn .18s; }
        .cart-item:hover .del-btn { opacity:1; }
        .del-btn { opacity:0;transition:opacity .15s;background:none;border:none;cursor:pointer;color:#F87171;padding:2px;border-radius:4px; }
        .del-btn:hover { color:${C.danger}; }
        .menu-dropdown { position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid ${C.border};z-index:50;min-width:160px;overflow:hidden;animation:fadeIn .15s; }
        .menu-item { width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${C.text};font-family:inherit;text-align:left; }
        .menu-item:hover { background:#F5F4FF;color:${C.brand}; }
        .input-field { width:100%;padding:10px 14px;border:1.5px solid ${C.border};border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;background:#fff;color:${C.text}; }
        .input-field:focus { border-color:${C.brandMid}; }
        .sync-btn { background:none;border:1.5px solid rgba(255,255,255,.3);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#fff;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .15s;font-family:inherit; }
        .sync-btn:hover { background:rgba(255,255,255,.15); }
        .sync-btn:disabled { opacity:.5;cursor:not-allowed; }
        @keyframes syncSpin { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header style={{ height: 56, background: C.brand, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: "-1px" }}>POS</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "-.3px" }}>OneShop POS</span>
        </div>

        <div style={{ flex: 1, maxWidth: 420, margin: "0 auto", position: "relative" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: .4, pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ width: "100%", padding: "7px 12px 7px 30px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: "1px" }}>
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>

          {/* Online/Offline badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: isOnline ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)", borderRadius: 100 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#34D399" : "#F87171" }}/>
            <span style={{ color: isOnline ? "#6EE7B7" : "#FCA5A5", fontSize: 11, fontWeight: 600 }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Pending sync badge + sync button */}
          {pendingCount > 0 && (
            <button
              className="sync-btn"
              onClick={handleSync}
              disabled={syncing || !isOnline}
              title={isOnline ? "Click to sync" : "Will sync when online"}
            >
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: syncing ? "syncSpin 0.8s linear infinite" : "none" }}
              >
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              <span style={{ background: "#F87171", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{pendingCount}</span>
              {syncing ? "Syncing…" : "Pending"}
            </button>
          )}

          {/* Sync success message */}
          {syncMessage && (
            <span style={{ fontSize: 11, fontWeight: 700, color: syncMessage.includes("✓") ? "#6EE7B7" : "#FCA5A5" }}>
              {syncMessage}
            </span>
          )}

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{user?.name || "User"}</div>
              <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, marginTop: 2 }}>{user?.role || "Role"}</div>
            </div>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "1.5px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {(user?.name || "U")[0].toUpperCase()}
            </button>
            {showMenu && (
              <div className="menu-dropdown">
                <button className="menu-item" onClick={handleSync} disabled={syncing || !isOnline || pendingCount === 0}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  Sync Now {pendingCount > 0 ? `(${pendingCount})` : ""}
                </button>
                <button className="menu-item" onClick={handleLogout}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* ── Left: Products ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {["All", ...categories.map(c => c.name)].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`cat-pill ${activeCategory === cat ? "active" : "inactive"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
            {filteredProducts.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: C.muted, gap: 8 }}>
                <span style={{ fontSize: 40 }}>🔍</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>No products found</span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
               {filteredProducts.map((product, i) => {
  const [g1, g2] = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
  const inCart = cart.find(c => c.id === product._id);
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const stockPercent = Math.min(100, (product.stock / 100) * 100);
  const stockColor = product.stock === 0 ? C.danger : product.stock <= 10 ? "#F59E0B" : C.success;
  const initial = product.name.charAt(0).toUpperCase();

  return (
    <div
      key={product._id}
      onClick={() => addToCart(product)}
      className={`prod-card${addedId === product._id ? " pop" : ""}`}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1.5px solid ${inCart ? C.brand : C.border}`,
        overflow: "hidden",
        opacity: product.stock === 0 ? 0.6 : 1,
        cursor: product.stock === 0 ? "not-allowed" : "pointer",
        boxShadow: inCart ? `0 4px 16px rgba(27,26,85,0.15)` : "none",
        transition: "all .15s",
      }}
    >
      {/* Card Image Area */}
      <div style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        
        {/* Product Initial Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 900, color: C.brand,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          {initial}
        </div>

        {/* Category badge top left */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(4px)",
          padding: "2px 8px", borderRadius: 100,
          fontSize: 9, fontWeight: 700, color: C.brandMid,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {product.category}
        </div>

        {/* Cart qty badge top right */}
        {inCart && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: C.brand, color: "#fff",
            width: 22, height: 22, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
            boxShadow: "0 2px 6px rgba(27,26,85,0.3)",
          }}>
            {inCart.qty}
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              color: "#fff", fontSize: 10, fontWeight: 800,
              background: C.danger, padding: "3px 10px", borderRadius: 100,
              letterSpacing: "0.5px",
            }}>OUT OF STOCK</span>
          </div>
        )}

        {/* Low stock warning */}
        {isLowStock && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: "#FEF3C7", border: "1px solid #FDE68A",
            padding: "2px 8px", borderRadius: 100,
            fontSize: 9, fontWeight: 700, color: "#92400E",
          }}>
            ⚠ LOW STOCK
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {product.name}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.brand, fontFamily: "'DM Mono', monospace" }}>
            Rs. {product.sellingPrice.toLocaleString()}
          </div>
        </div>

        {/* Stock bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: stockColor }}>{product.stock}</span>
          </div>
          <div style={{ height: 4, background: "#F3F4F6", borderRadius: 100, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, (product.stock / 120) * 100)}%`,
              background: stockColor,
              borderRadius: 100,
              transition: "width .3s ease",
            }}/>
          </div>
        </div>
      </div>
    </div>
  );
})}
              </div>
            )}
          </div>

          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.bg, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ghost-btn" onClick={() => router.push("/pos/transactions")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                History
              </button>
              <button className="ghost-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Customers
              </button>
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>{filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}</span>
          </div>
        </main>

 {/* ── Right: Cart ──────────────────────────────────────────────────── */}
<aside style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
  
  {/* Header */}
  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Cart</span>
      {cart.length > 0 && (
        <div style={{ background: C.brand, color: "#fff", borderRadius: 100, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
          {cart.reduce((a, i) => a + i.qty, 0)} items
        </div>
      )}
    </div>
    {cart.length > 0 && (
      <button
      onClick={() => { setCart([]); setDiscount(0); setPromoCode(""); setSelectedCustomer(null); }}      
     style={{ fontSize: 11, fontWeight: 700, color: C.danger, background: "#FEF2F2", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
      >
        Clear All
      </button>
    )}
  </div>

{/* Customer */}
<div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>Customer</div>

  {selectedCustomer ? (
    // Selected customer display
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#F0F2F8", borderRadius: 10, border: `1.5px solid ${C.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
        {selectedCustomer.avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedCustomer.name}</div>
        <div style={{ fontSize: 10, color: C.muted }}>{selectedCustomer.phone}</div>
      </div>
      <button
        onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  ) : (
    // Search input
    <div style={{ position: "relative" }}>
      <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        placeholder="Search customer..."
        value={customerSearch}
        onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
        onFocus={() => setShowCustomerDropdown(true)}
        className="input-field"
        style={{ fontSize: 13, paddingLeft: 30 }}
      />
    </div>
  )}

  {/* Dropdown */}
  {showCustomerDropdown && !selectedCustomer && (
    <div style={{
      position: "absolute", left: 16, right: 16, top: "100%",
      background: "#fff", borderRadius: 12, border: `1.5px solid ${C.border}`,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50,
      maxHeight: 220, overflowY: "auto",
    }}>
      {/* Guest option */}
      <div
        onClick={() => { setSelectedCustomer({ _id: "guest", name: "Guest Customer", email: "", phone: "", avatar: "G", totalOrders: 0, totalSpent: 0 }); setShowCustomerDropdown(false); setCustomerSearch(""); }}
        style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}
        onMouseEnter={e => (e.currentTarget.style.background = "#F5F4FF")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E3E6F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.muted }}>G</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Guest Customer</div>
          <div style={{ fontSize: 10, color: C.muted }}>No account needed</div>
        </div>
      </div>

      {/* Filtered customers */}
      {customers
        .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
        .map(c => (
          <div
            key={c._id}
            onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(""); }}
            style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F5F4FF")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {c.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{c.phone} · {c.totalOrders} orders</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.brandMid, flexShrink: 0 }}>
              Rs. {c.totalSpent.toLocaleString()}
            </div>
          </div>
        ))}

      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).length === 0 && customerSearch && (
        <div style={{ padding: "14px", textAlign: "center", color: C.muted, fontSize: 12 }}>No customers found</div>
      )}
    </div>
  )}
</div>

  {/* Cart Items */}
  <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
    {cart.length === 0 ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, gap: 12 }}>
        <div style={{ width: 72, height: 72, background: "#F0F2F8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.brandLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Cart is empty</div>
          <div style={{ fontSize: 12, color: C.muted }}>Click a product to add it</div>
        </div>
      </div>
    ) : (
      cart.map(item => (
        <div key={item.id} className="cart-item">
          {/* Item initial */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E8ECF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.brand, flexShrink: 0 }}>
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Rs. {item.price.toLocaleString()} / unit</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 20, textAlign: "center" }}>{item.qty}</span>
            <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, width: 52, textAlign: "right" }}>Rs. {(item.price * item.qty).toLocaleString()}</div>
          <button className="del-btn" onClick={() => updateQty(item.id, -item.qty)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      ))
    )}
  </div>

  {/* Totals */}
  <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "12px 16px 0" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Rs. {subtotal.toLocaleString()}</span>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: C.muted }}>Tax (8%)</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Rs. {tax.toFixed(2)}</span>
    </div>
    {discount > 0 && (
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.success }}>Discount ({promoCode})</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>−Rs. {discount.toFixed(2)}</span>
      </div>
    )}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Total</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: C.brand, letterSpacing: "-1px", fontFamily: "'DM Mono',monospace" }}>Rs. {total.toLocaleString()}</span>
    </div>
  </div>

  {error && (
    <div style={{ padding: "6px 16px" }}>
      <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10 }}>
        <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{error}</p>
      </div>
    </div>
  )}

  {/* Actions */}
  <div style={{ flexShrink: 0, padding: "10px 16px 14px" }}>
    <button
      className="ghost-btn"
      style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
      onClick={() => { setShowPromo(true); setPromoError(""); setPromoSuccess(""); }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
      {discount > 0 ? `Promo Applied: −Rs. ${discount.toFixed(2)}` : "Apply Promo Code"}
    </button>

    <button
      className="main-checkout-btn"
      onClick={() => {
        if (cart.length === 0) { setError("Cart is empty"); return; }
        setError("");
        setShowCheckout(true);
      }}
      disabled={cart.length === 0}
      style={{ background: cart.length === 0 ? "#9290C3" : C.brand }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
      {cart.length === 0 ? "CHECKOUT" : `CHECKOUT · Rs. ${total.toLocaleString()}`}
    </button>
  </div>
</aside>       
      </div>

      {showCheckout && (
        <CheckoutModal
          state={checkoutState}
          subtotal={subtotal}
          tax={tax}
          total={total}
          isOnline={isOnline}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
      {/* Promo Modal */}
{showPromo && (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    onClick={(e) => { if (e.target === e.currentTarget) { setShowPromo(false); setPromoError(""); setPromoSuccess(""); } }}
  >
    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380, padding: 28, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Apply Promo Code</h3>
        <button
          onClick={() => { setShowPromo(false); setPromoError(""); setPromoSuccess(""); }}
          style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Current discount */}
      {discount > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: "#065F46", margin: 0, fontWeight: 700 }}>✓ Applied: {promoCode}</p>
            <p style={{ fontSize: 12, color: "#065F46", margin: 0 }}>Saving Rs. {discount.toFixed(2)}</p>
          </div>
          <button
            onClick={() => { setDiscount(0); setPromoCode(""); setPromoInput(""); setPromoSuccess(""); }}
            style={{ fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Remove
          </button>
        </div>
      )}

      {promoError && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>{promoError}</p>
        </div>
      )}

      {promoSuccess && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: "#065F46", margin: 0, fontWeight: 600 }}>✓ {promoSuccess}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Enter promo code"
          value={promoInput}
          onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); setPromoSuccess(""); }}
          style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "1px" }}
        />
        <button
          disabled={promoLoading || !promoInput.trim()}
          onClick={async () => {
            setPromoLoading(true);
            setPromoError("");
            setPromoSuccess("");
            try {
              const { data } = await api.post('/promos/validate', {
                code: promoInput,
                orderAmount: subtotal,
              });
              setDiscount(data.data.discountAmount);
              setPromoCode(data.data.code);
              setPromoSuccess(data.data.message);
            } catch (err: any) {
              setPromoError(err.response?.data?.message || "Invalid promo code");
            } finally {
              setPromoLoading(false);
            }
          }}
          style={{ padding: "10px 18px", background: promoLoading || !promoInput.trim() ? "#9290C3" : C.brand, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: promoLoading || !promoInput.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          {promoLoading ? "..." : "Apply"}
        </button>
      </div>

      <p style={{ fontSize: 11, color: C.muted, marginTop: 10, textAlign: "center" }}>
        Promo codes are case-insensitive
      </p>
    </div>
  </div>
)}
{/* Weight Input Modal */}
{showWeightModal && weightProduct && (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    onClick={(e) => { if (e.target === e.currentTarget) setShowWeightModal(false); }}
  >
    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360, padding: 28, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Enter Weight</h3>
        <button
          onClick={() => setShowWeightModal(false)}
          style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Product info */}
      <div style={{ background: "#F0F2F8", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{weightProduct.name}</div>
        <div style={{ fontSize: 13, color: C.muted }}>Price: <span style={{ fontWeight: 700, color: C.brand }}>Rs. {weightProduct.sellingPrice.toLocaleString()} / kg</span></div>
      </div>

      {/* Weight input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Weight (kg)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 0.75 for 750g"
          value={weightInput}
          onChange={(e) => { setWeightInput(e.target.value); setWeightError(""); }}
          autoFocus
          style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${weightError ? "#FECACA" : C.border}`, borderRadius: 10, fontSize: 18, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box", textAlign: "center" }}
        />
        {weightError && <p style={{ fontSize: 12, color: "#EF4444", margin: "6px 0 0" }}>{weightError}</p>}
      </div>

      {/* Price preview */}
      {weightInput && parseFloat(weightInput) > 0 && (
        <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>
            {weightInput} kg × Rs. {weightProduct.sellingPrice.toLocaleString()} = {" "}
            <span style={{ fontSize: 16, fontWeight: 900 }}>
              Rs. {(parseFloat(weightInput) * weightProduct.sellingPrice).toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {/* Quick weight buttons */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Quick Select</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["0.25", "0.5", "0.75", "1", "1.5", "2"].map(w => (
            <button
              key={w}
              onClick={() => { setWeightInput(w); setWeightError(""); }}
              style={{
                padding: "6px 14px", borderRadius: 100,
                background: weightInput === w ? C.brand : "#F0F2F8",
                color: weightInput === w ? "#fff" : C.text,
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              {w} kg
            </button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => {
          const weight = parseFloat(weightInput);
          if (!weightInput || isNaN(weight) || weight <= 0) {
            setWeightError("Please enter a valid weight");
            return;
          }
          if (weight > weightProduct.stock) {
            setWeightError(`Only ${weightProduct.stock} kg available in stock`);
            return;
          }
          const totalPrice = parseFloat((weight * weightProduct.sellingPrice).toFixed(2));
          setCart(prev => {
            const existingIndex = prev.findIndex(i => i.id === weightProduct._id);
            if (existingIndex >= 0) {
              return prev.map((i, idx) => idx === existingIndex
                ? { ...i, weight: (i.weight || 0) + weight, price: weightProduct.sellingPrice, qty: parseFloat(((i.weight || 0) + weight).toFixed(2)) }
                : i
              );
            }
            return [...prev, {
              id: weightProduct._id,
              name: `${weightProduct.name} (${weight}kg)`,
              price: totalPrice,
              qty: 1,
              unit: 'kg',
              weight,
            }];
          });
          setAddedId(weightProduct._id);
          setTimeout(() => setAddedId(null), 350);
          setShowWeightModal(false);
          setWeightInput("");
        }}
        style={{ width: "100%", height: 48, background: C.brand, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        Add to Cart
      </button>
    </div>
  </div>
)}
    </div>
  );
}