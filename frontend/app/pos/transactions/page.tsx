"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Transaction {
  _id: string;
  txnId: string;
  orderId: string;
  customer: string;
  paymentMethod: "Cash" | "Card" | "Bank Transfer";
  amount: number;
  status: "success" | "pending" | "failed";
  createdAt: string;
}

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:      "#1B1A55",
  brandMid:   "#535C91",
  brandLight: "#9290C3",
  bg:         "#F0F2F8",
  surface:    "#FFFFFF",
  border:     "#E3E6F0",
  text:       "#111827",
  muted:      "#6B7280",
  success:    "#10B981",
};

const PAYMENT_ICONS: Record<string, JSX.Element> = {
  Cash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  ),
  Card: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#535C91" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  "Bank Transfer": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
};

const PAYMENT_COLORS: Record<string, string> = {
  Cash:            "#D1FAE5",
  Card:            "#EDE9FE",
  "Bank Transfer": "#FEF3C7",
};

const PAYMENT_TEXT: Record<string, string> = {
  Cash:            "#065F46",
  Card:            "#4C1D95",
  "Bank Transfer": "#92400E",
};

const ITEMS_PER_PAGE = 5;

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("All");

  useEffect(() => {
    if (!authLoading && !user) router.push("/pos/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
        const { data } = await api.get('/transactions');
        console.log('Transactions response:', data);
        setTransactions(data.data);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchTransactions();
  }, [user]);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.txnId.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.orderId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = paymentFilter === "All" || t.paymentMethod === paymentFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const todaySales = transactions.reduce((s, t) => s + t.amount, 0);
  const avgBill = transactions.length ? Math.round(todaySales / transactions.length) : 0;

  if (authLoading || loadingData) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.brand}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
        .row-hover:hover { background: #F5F4FF !important; }
        .page-btn { width:32px;height:32px;border-radius:8px;border:1.5px solid ${C.border};background:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${C.muted};transition:all .15s; }
        .page-btn:hover:not(:disabled) { border-color:${C.brandLight};color:${C.brand}; }
        .page-btn.active { background:${C.brand};color:#fff;border-color:${C.brand}; }
        .page-btn:disabled { opacity:.35;cursor:not-allowed; }
        .search-input { width:100%;padding:10px 16px 10px 40px;border:1.5px solid ${C.border};border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:#fff;color:${C.text};transition:border-color .15s; }
        .search-input:focus { border-color:${C.brandMid}; }
        .filter-pill { padding:6px 16px;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s; }
        .filter-pill.active { background:${C.brand};color:#fff;border-color:${C.brand}; }
        .filter-pill.inactive { background:#F3F4F6;color:${C.muted};border-color:transparent; }
        .filter-pill.inactive:hover { border-color:${C.brandLight};color:${C.brand}; }
      `}</style>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted, marginBottom: 20 }}>
          <button onClick={() => router.push("/pos")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "inherit" }}>Home</button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ color: C.text, fontWeight: 600 }}>Transaction History</span>
        </div>

        {/* Page Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", marginBottom: 4 }}>Transaction History</h1>
          <p style={{ fontSize: 13, color: C.muted }}>Manage and audit your business sales performance</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }} className="fade-up">
          {/* Total Sales */}
          <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${C.brand} 0%, #2D2B8F 100%)`, padding: "24px 24px 20px", position: "relative", overflow: "hidden", minHeight: 130 }}>
            <div style={{ position: "absolute", right: -10, top: -10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.06)" }}/>
            <div style={{ position: "absolute", right: 20, bottom: -20, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,.05)" }}/>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Total Sales</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-1px", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>Rs. {todaySales.toLocaleString()}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(52,211,153,.2)", borderRadius: 100, padding: "3px 10px" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6EE7B7" }}>{transactions.length} transactions</span>
            </div>
          </div>

          {/* Transactions Count */}
          <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${C.brandMid} 0%, #6D75C0 100%)`, padding: "24px 24px 20px", position: "relative", overflow: "hidden", minHeight: 130 }}>
            <div style={{ position: "absolute", right: -10, top: -10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.06)" }}/>
            <svg style={{ position: "absolute", right: 20, bottom: 20, opacity: .15 }} width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Transactions</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 8 }}>{transactions.length}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 500 }}>Avg: Rs. {avgBill.toLocaleString()}</p>
          </div>

          {/* Success Rate */}
          <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${C.brandLight} 0%, #A8A6D8 100%)`, padding: "24px 24px 20px", position: "relative", overflow: "hidden", minHeight: 130 }}>
            <div style={{ position: "absolute", right: -10, top: -10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.06)" }}/>
            <svg style={{ position: "absolute", right: 16, bottom: 12, opacity: .18 }} width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Success Rate</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 8 }}>
              {transactions.length ? Math.round((transactions.filter(t => t.status === 'success').length / transactions.length) * 100) : 0}%
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 500 }}>{transactions.filter(t => t.status === 'success').length} successful</p>
          </div>
        </div>

        {/* Table Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }} className="fade-up">
          {/* Search + filter row */}
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="search-input"
                placeholder="Search by transaction #, customer or order ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["All", "Cash", "Card", "Bank Transfer"].map((f) => (
                <div
                  key={f}
                  className={`filter-pill ${paymentFilter === f ? "active" : "inactive"}`}
                  onClick={() => { setPaymentFilter(f); setPage(1); }}
                >{f}</div>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 130px 180px 1fr 110px 140px 80px", padding: "10px 24px", background: "#FAFAFA", borderBottom: `1px solid ${C.border}` }}>
            {["Time", "Transaction #", "Customer", "Order ID", "Total", "Payment", "Status"].map((h) => (
              <div key={h} style={{ fontSize: 12, fontWeight: 700, color: C.brandMid, letterSpacing: "0.3px" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: C.muted, fontSize: 14 }}>
              {transactions.length === 0 ? "No transactions yet" : "No transactions match your search"}
            </div>
          ) : (
            paginated.map((t, i) => (
              <div
                key={t._id}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 130px 180px 1fr 110px 140px 80px",
                  padding: "14px 24px",
                  borderBottom: i < paginated.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "center",
                  background: "#fff",
                  transition: "background .15s",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.brandMid }}>#{t.txnId}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.customer}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t.orderId}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Rs. {t.amount.toLocaleString()}</div>
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 100,
                    background: PAYMENT_COLORS[t.paymentMethod] ?? "#F3F4F6",
                    fontSize: 12, fontWeight: 600,
                    color: PAYMENT_TEXT[t.paymentMethod] ?? "#374151",
                  }}>
                    {PAYMENT_ICONS[t.paymentMethod]}
                    {t.paymentMethod}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" fill={t.status === 'success' ? "#D1FAE5" : t.status === 'pending' ? "#FEF3C7" : "#FEE2E2"}/>
                    <polyline points="7 12 10.5 15.5 17 9" stroke={t.status === 'success' ? "#10B981" : t.status === 'pending' ? "#D97706" : "#EF4444"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>
              Showing {filtered.length === 0 ? 0 : Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} transactions
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Summary Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: "28px 40px", display: "flex", justifyContent: "center", gap: 80 }} className="fade-up">
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Average Bill</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", fontFamily: "'DM Mono',monospace" }}>Rs. {avgBill.toLocaleString()}</p>
          </div>
          <div style={{ width: 1, background: C.border }}/>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Total Records</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", fontFamily: "'DM Mono',monospace" }}>{transactions.length}</p>
          </div>
        </div>

      </div>
    </div>
  );
}