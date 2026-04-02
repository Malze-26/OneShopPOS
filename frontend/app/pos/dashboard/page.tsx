"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";

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
  onClose,
  onSuccess,
}: {
  state: { items: any[]; customer: any; discount: number; discountCode: string };
  subtotal: number;
  tax: number;
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState("cash");
  const [cash, setCash] = useState("");
  const [step, setStep] = useState<"pay" | "success">("pay");
  const [orderId] = useState(genId);

  const cashAmt = parseFloat(cash) || 0;
  const change = Math.max(0, cashAmt - total);
  const canPay = method !== "cash" || cashAmt >= total;

  const confirm = async () => {
    try {
      await api.post("/transactions", {
        orderId: orderId,
        customer: state.customer?.name || "Guest Customer",
        paymentMethod: method === "cash" ? "Cash" : method === "card" ? "Card" : "Bank Transfer",
        amount: total,
        status: "success",
      });
      setStep("success");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create order");
    }
  };

  const printReceipt = () => {
    try {
      const receiptWindow = window.open("", "_blank", "width=700,height=900");
      if (!receiptWindow) return alert("Unable to open print window. Please allow popups.");

      const now = new Date();
      const itemsHtml = state.items
        .map(
          (i) => `
        <tr>
          <td style="padding:6px 8px">${i.name} × ${i.qty}</td>
          <td style="padding:6px 8px;text-align:right">${fmt(i.price * i.qty)}</td>
        </tr>`
        )
        .join("");

      const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ${orderId}</title>
          <style>
            body{font-family:Inter,Arial,Helvetica,sans-serif;color:#111;margin:0;padding:24px;background:#fff}
            .wrap{display:flex;justify-content:center}
            .receipt{width:320px;border:4px solid #24106d;padding:16px}
            .brand{font-weight:800;color:#24106d;margin-bottom:8px}
            .muted{color:#6b7280;font-size:12px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            td{font-size:13px;padding:6px 8px}
            @media print{body{margin:0;padding:8px}.receipt{border:none}}
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="receipt">
              <div class="brand">OneShop POS</div>
              <div class="muted">STORE-2025-001</div>
              <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
              <div style="font-size:13px">Receipt: <strong>#${orderId}</strong></div>
              <div style="font-size:13px">Date: <strong>${now.toLocaleDateString()}</strong></div>
              <div style="font-size:13px">Time: <strong>${now.toLocaleTimeString()}</strong></div>
              <table><tbody>${itemsHtml}</tbody></table>
              <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px">
                <div style="display:flex;justify-content:space-between;font-size:13px"><div>SUBTOTAL</div><div>${fmt(subtotal)}</div></div>
                <div style="display:flex;justify-content:space-between;font-size:13px"><div>TAX (8%)</div><div>${fmt(tax)}</div></div>
                ${state.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px"><div>DISCOUNT</div><div>-${fmt(state.discount)}</div></div>` : ""}
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;margin-top:6px"><div>TOTAL</div><div>${fmt(total)}</div></div>
                ${method === "cash" && cashAmt > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px"><div>Cash Tendered</div><div>${fmt(cashAmt)}</div></div>` : ""}
                ${method === "cash" && cashAmt > total ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px"><div>Change Due</div><div>${fmt(Math.max(0, cashAmt - total))}</div></div>` : ""}
              </div>
              <div style="text-align:center;margin-top:12px;font-size:11px;color:#9ca3af">THANK YOU FOR CHOOSING US</div>
            </div>
          </div>
        </body>
        </html>`;

      receiptWindow.document.open();
      receiptWindow.document.write(html);
      receiptWindow.document.close();
      receiptWindow.focus();
      setTimeout(() => { receiptWindow.print(); }, 600);
    } catch (err) {
      console.error(err);
      alert("Printing failed");
    }
  };

  const sendEmail = async () => {
    try {
      let to = state.customer?.email;
      if (!to) to = window.prompt("Enter recipient email:");
      if (!to) return alert("Please select a customer or enter an email address.");

      const now = new Date();
      const lines: string[] = [];
      lines.push("OneShop POS");
      lines.push("STORE-2025-001");
      lines.push("\n");
      lines.push(`Receipt: #${orderId}`);
      lines.push(`Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
      lines.push("\nItems:");
      state.items.forEach((i) => lines.push(`${i.name} x${i.qty} \t ${fmt(i.price * i.qty)}`));
      lines.push("\n");
      lines.push(`SUBTOTAL: ${fmt(subtotal)}`);
      lines.push(`TAX (8%): ${fmt(tax)}`);
      if (state.discount > 0) lines.push(`DISCOUNT: -${fmt(state.discount)}`);
      lines.push(`TOTAL: ${fmt(total)}`);
      if (method === "cash" && cashAmt > 0) lines.push(`Cash Tendered: ${fmt(cashAmt)}`);
      if (method === "cash" && cashAmt > total) lines.push(`Change Due: ${fmt(Math.max(0, cashAmt - total))}`);
      lines.push("\nThank you for choosing us.");

      const subject = encodeURIComponent(`Receipt #${orderId}`);
      const body = encodeURIComponent(lines.join("\n"));
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
    } catch (err) {
      console.error(err);
      alert("Failed to open email client");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
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
        .success-check { width:64px;height:64px;background:#D1FAE5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto; }
      `}</style>

      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 440, overflow: "hidden", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{step === "success" ? "Order Complete ✓" : "Checkout"}</span>
          <button onClick={step === "success" ? onSuccess : onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {step === "pay" ? (
          <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
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
                    <span>Discount {state.discountCode ? `(${state.discountCode})` : ""}</span>
                    <span>−{fmt(state.discount)}</span>
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
              Confirm Payment · {fmt(total)}
            </button>
          </div>
        ) : (
          /* Success */
          <div style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className="success-check">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Payment Successful!</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                Order <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: C.text }}>{orderId}</span>
              </div>
            </div>
            <div style={{ width: "100%", background: C.surface2, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
              {[
                { label: "Total Paid", value: fmt(total) },
                { label: "Method", value: method.charAt(0).toUpperCase() + method.slice(1) },
                ...(method === "cash" && cashAmt > total ? [{ label: "Change", value: fmt(change) }] : []),
                ...(state.customer ? [{ label: "Customer", value: state.customer.name }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button className="modal-ghost-btn" style={{ flex: 1, justifyContent: "center" }} onClick={printReceipt}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                </svg>
                Print
              </button>
              <button className="modal-ghost-btn" style={{ flex: 1, justifyContent: "center" }} onClick={sendEmail}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v12H4z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
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

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [showCheckout, setShowCheckout] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
        ]);
        setProducts(productsRes.data.data);
        setCategories(categoriesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/pos/login");
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax - discount).toFixed(2));

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product._id);
      if (existing) return prev.map((i) => i.id === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product._id, name: product.name, price: product.sellingPrice, qty: 1 }];
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
    setSelectedCustomer("");
    setDiscount(0);
    setPromoCode("");
    setShowCheckout(false);
  };

  const checkoutState = {
    items: cart,
    customer: selectedCustomer ? { name: selectedCustomer } : null,
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
        .menu-dropdown { position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid ${C.border};z-index:50;min-width:140px;overflow:hidden;animation:fadeIn .15s; }
        .menu-item { width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${C.text};font-family:inherit;text-align:left; }
        .menu-item:hover { background:#F5F4FF;color:${C.brand}; }
        .input-field { width:100%;padding:10px 14px;border:1.5px solid ${C.border};border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;background:#fff;color:${C.text}; }
        .input-field:focus { border-color:${C.brandMid}; }
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
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(16,185,129,.2)", borderRadius: 100 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }}/>
            <span style={{ color: "#6EE7B7", fontSize: 11, fontWeight: 600 }}>Online</span>
          </div>
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
                  return (
                    <div
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className={`prod-card${addedId === product._id ? " pop" : ""}`}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: `1.5px solid ${C.border}`,
                        overflow: "hidden",
                        opacity: product.stock === 0 ? 0.5 : 1,
                        cursor: product.stock === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      <div style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <span style={{ fontSize: 36, opacity: .6, userSelect: "none" }}>📦</span>
                        {product.stock === 0 && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, background: C.danger, padding: "2px 8px", borderRadius: 100 }}>OUT OF STOCK</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 10px 12px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{product.name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>Rs. {product.sellingPrice.toLocaleString()}</div>
                          {inCart && <div style={{ fontSize: 10, fontWeight: 700, background: C.brand, color: "#fff", padding: "2px 6px", borderRadius: 100 }}>{inCart.qty}</div>}
                        </div>
                        <div style={{ fontSize: 10, color: product.stock < 10 ? C.danger : C.muted, marginTop: 2 }}>Stock: {product.stock}</div>
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
          {/* Customer */}
          <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Selected Customer</div>
            <input
              type="text"
              placeholder="Search customer..."
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="input-field"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, gap: 10 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Cart is empty</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Click a product to add it</div>
                </div>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmt(item.price)} / unit</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 20, textAlign: "center" }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 48, textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
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
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "14px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Subtotal</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Tax (8%)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(tax)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.brand }}>Discount</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>−{fmt(discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Total</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: C.brand, letterSpacing: "-1px", fontFamily: "'DM Mono',monospace" }}>{fmt(total)}</span>
            </div>
          </div>

          {error && (
            <div style={{ padding: "8px 16px" }}>
              <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: C.danger }}>{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ flexShrink: 0, padding: "12px 16px" }}>
            <div style={{ marginBottom: 10 }}>
              <button className="ghost-btn" style={{ width: "100%", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                Promo
              </button>
            </div>
            <button
              className="main-checkout-btn"
              onClick={() => {
                if (cart.length === 0) { setError("Cart is empty"); return; }
                setError("");
                setShowCheckout(true);
              }}
              disabled={cart.length === 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              CHECKOUT
            </button>
          </div>
        </aside>
      </div>

      {/* ── Checkout Modal ───────────────────────────────────────────────────── */}
      {showCheckout && (
        <CheckoutModal
          state={checkoutState}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}