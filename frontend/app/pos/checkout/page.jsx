"use client";

import { useState, useMemo, useReducer, useRef, useEffect } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  brand:       "#1B1A55",
  brandMid:    "#535C91",
  brandLight:  "#9290C3",
  accent:      "#F4A261",
  bg:          "#F0F2F8",
  surface:     "#FFFFFF",
  surface2:    "#F7F8FC",
  border:      "#E3E6F0",
  text:        "#111827",
  muted:       "#6B7280",
  success:     "#10B981",
  danger:      "#EF4444",
  brandText:   "#1B1A55",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",    name: "All" },
  { id: "coffee", name: "Coffee" },
  { id: "food",   name: "Food" },
  { id: "pastry", name: "Pastry" },
  { id: "drinks", name: "Cold Drinks" },
  { id: "merch",  name: "Merch" },
];

const PRODUCTS = [
  { id:"p01", name:"Flat White",       price:18.50, category:"coffee", emoji:"☕" },
  { id:"p02", name:"Americano",        price:12.00, category:"coffee", emoji:"☕" },
  { id:"p03", name:"Croissant",        price:4.25,  category:"pastry", emoji:"🥐" },
  { id:"p04", name:"Egg Toast",        price:2.50,  category:"food",   emoji:"🍳" },
  { id:"p05", name:"Blueberry Muffin", price:3.75,  category:"pastry", emoji:"🧁" },
  { id:"p06", name:"Iced Latte",       price:4.95,  category:"coffee", emoji:"🥤" },
  { id:"p07", name:"Matcha Latte",     price:5.50,  category:"drinks", emoji:"🍵" },
  { id:"p08", name:"Cold Brew",        price:6.00,  category:"drinks", emoji:"🧊" },
  { id:"p09", name:"Takeaway Cup (L)", price:1.00,  category:"merch",  emoji:"🛍️" },
  { id:"p10", name:"Avocado Toast",    price:12.50, category:"food",   emoji:"🥑" },
  { id:"p11", name:"Banana Bread",     price:4.50,  category:"pastry", emoji:"🍞" },
  { id:"p12", name:"Cappuccino",       price:4.80,  category:"coffee", emoji:"☕" },
];

const CUSTOMERS = [
  { id:"c01", name:"Alex Turner",   email:"alex@mail.com",   pts:240 },
  { id:"c02", name:"Priya Sharma",  email:"priya@mail.com",  pts:80  },
  { id:"c03", name:"James Wick",    email:"james@mail.com",  pts:510 },
  { id:"c04", name:"Mei Lin",       email:"mei@mail.com",    pts:35  },
  { id:"c05", name:"Carlos Mendez", email:"carlos@mail.com", pts:190 },
];

const PROMO_CODES = { SAVE250: 2.50, WELCOME5: 5.00, LOYALTY10: 10.00 };

const CARD_GRADIENTS = [
  ["#E0E7FF","#C7D2FE"], ["#EDE9FE","#DDD6FE"], ["#DBEAFE","#BFDBFE"],
  ["#CFFAFE","#A5F3FC"], ["#D1FAE5","#A7F3D0"], ["#FEF3C7","#FDE68A"],
  ["#FFE4E6","#FECDD3"], ["#F3E8FF","#E9D5FF"],
];

const fmt = (n) => `$${Math.abs(n).toFixed(2)}`;
const genId = () => "ORD-" + Math.random().toString(36).slice(2,8).toUpperCase();

// ─── Reducer ──────────────────────────────────────────────────────────────────
const initial = { items:[], discount:0, discountCode:"", customer:null, promoInput:"", promoError:"" };

function reducer(state, action) {
  switch(action.type) {
    case "ADD": {
      const ex = state.items.find(i=>i.id===action.p.id);
      return { ...state, items: ex
        ? state.items.map(i=>i.id===action.p.id?{...i,qty:i.qty+1}:i)
        : [...state.items, {...action.p, qty:1}] };
    }
    case "INC": return { ...state, items: state.items.map(i=>i.id===action.id?{...i,qty:i.qty+1}:i) };
    case "DEC": return { ...state, items: action.qty<=1
      ? state.items.filter(i=>i.id!==action.id)
      : state.items.map(i=>i.id===action.id?{...i,qty:i.qty-1}:i) };
    case "DEL": return { ...state, items: state.items.filter(i=>i.id!==action.id) };
    case "CLEAR": return { ...initial };
    case "SET_CUST": return { ...state, customer: action.c };
    case "PROMO_IN": return { ...state, promoInput: action.v, promoError:"" };
    case "PROMO_APPLY": {
      const code = state.promoInput.trim().toUpperCase();
      const disc = PROMO_CODES[code];
      if (!disc) return { ...state, promoError:"Invalid promo code" };
      return { ...state, promoError:"", discount:disc, discountCode:code };
    }
    case "PROMO_REMOVE": return { ...state, discount:0, discountCode:"", promoInput:"", promoError:"" };
    default: return state;
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function POS() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [mobileCart, setMobileCart] = useState(false);
  const [time, setTime] = useState(new Date());
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    const t = setInterval(()=>setTime(new Date()), 1000);
    return ()=>clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (activeCat !== "all") list = list.filter(p=>p.category===activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p=>p.name.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, search]);

  const subtotal = state.items.reduce((s,i)=>s+i.price*i.qty, 0);
  const discounted = Math.max(0, subtotal - state.discount);
  const tax = +(discounted * 0.08).toFixed(2);
  const total = +(discounted + tax).toFixed(2);
  const cartCount = state.items.reduce((s,i)=>s+i.qty, 0);

  const handleAdd = (p) => {
    dispatch({ type:"ADD", p });
    setAddedId(p.id);
    setTimeout(()=>setAddedId(null), 350);
  };

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'DM Sans', system-ui, sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:4px; }

        .prod-card { transition: transform .15s, box-shadow .15s, border-color .15s; cursor:pointer; }
        .prod-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(27,26,85,.12); border-color:#9290C3 !important; }
        .prod-card:active { transform:scale(.96); }
        .prod-card.pop { animation: pop .3s ease-out; }
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }

        .qty-btn { width:28px;height:28px;border-radius:8px;border:1.5px solid ${C.border};background:#fff;cursor:pointer;font-size:15px;font-weight:700;color:${C.muted};display:flex;align-items:center;justify-content:center;transition:all .12s;line-height:1; }
        .qty-btn:hover { background:${C.brand};color:#fff;border-color:${C.brand}; }
        .qty-btn:active { transform:scale(.88); }

        .cat-pill { padding:6px 16px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s;white-space:nowrap; }
        .cat-pill.active { background:${C.brand};color:#fff; }
        .cat-pill.inactive { background:#fff;color:${C.muted};border-color:${C.border}; }
        .cat-pill.inactive:hover { border-color:${C.brandLight};color:${C.brand}; }

        .checkout-btn { width:100%;height:52px;background:${C.brand};color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;letter-spacing:.2px; }
        .checkout-btn:hover:not(:disabled) { background:${C.brandMid};transform:translateY(-1px);box-shadow:0 6px 20px rgba(27,26,85,.25); }
        .checkout-btn:active:not(:disabled) { transform:scale(.98); }
        .checkout-btn:disabled { opacity:.4;cursor:not-allowed; }

        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal { background:#fff;border-radius:24px;width:100%;max-width:440px;overflow:hidden;animation:slideUp .25s ease-out; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .pay-btn { flex:1;padding:14px 8px;border-radius:12px;border:1.5px solid ${C.border};background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${C.muted};transition:all .15s; }
        .pay-btn.active { background:${C.brand};color:#fff;border-color:${C.brand};box-shadow:0 4px 14px rgba(27,26,85,.2); }
        .pay-btn:hover:not(.active) { border-color:${C.brandLight};color:${C.brand};background:#F5F4FF; }

        .input-field { width:100%;padding:10px 14px;border:1.5px solid ${C.border};border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;background:#fff;color:${C.text}; }
        .input-field:focus { border-color:${C.brandMid}; }

        .cart-item { display:flex;align-items:center;gap:10px;padding:10px 12px;background:${C.surface2};border:1px solid ${C.border};border-radius:12px;animation:fadeIn .18s; }
        .cart-item:hover .del-btn { opacity:1; }
        .del-btn { opacity:0;transition:opacity .15s;background:none;border:none;cursor:pointer;color:#F87171;padding:2px;border-radius:4px; }
        .del-btn:hover { color:${C.danger}; }

        .tag-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#EEF2FF;color:${C.brand};border-radius:6px;font-size:11px;font-weight:600; }
        .success-check { width:64px;height:64px;background:#D1FAE5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;animation:pop .4s ease-out; }
        .ghost-btn { background:none;border:1.5px solid ${C.border};border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;color:${C.muted};cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s; }
        .ghost-btn:hover { border-color:${C.brandLight};color:${C.brand};background:#F5F4FF; }
      `}</style>

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header style={{ height:56, background:C.brand, display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0, zIndex:20 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff",fontSize:10,fontWeight:900,letterSpacing:"-1px" }}>POS</span>
          </div>
          <span style={{ color:"#fff",fontWeight:700,fontSize:14,letterSpacing:"-.3px" }}>Brewed &amp; Baked</span>
        </div>

        {/* Search */}
        <div style={{ flex:1, maxWidth:420, margin:"0 auto", position:"relative" }}>
          <svg style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:.4,pointerEvents:"none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search products or scan barcode…"
            style={{ width:"100%",padding:"7px 12px 7px 30px",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.18)",borderRadius:8,color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit" }}
          />
        </div>

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {/* Time */}
          <span style={{ color:"rgba(255,255,255,.6)",fontSize:12,fontFamily:"'DM Mono',monospace",letterSpacing:"1px" }}>
            {time.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
          </span>

          {/* Online */}
          <div style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(16,185,129,.2)",borderRadius:100 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#34D399" }}/>
            <span style={{ color:"#6EE7B7",fontSize:11,fontWeight:600 }}>Online</span>
          </div>

          {/* Settings */}
          <button style={{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.1)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>

          {/* User */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#fff",fontSize:12,fontWeight:700,lineHeight:1 }}>Username 1</div>
              <div style={{ color:"rgba(255,255,255,.5)",fontSize:10,marginTop:2 }}>Store Manager</div>
            </div>
            <div style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"1.5px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700 }}>U</div>
          </div>

          {/* Mobile cart toggle */}
          <button onClick={()=>setMobileCart(v=>!v)} style={{ display:"none", width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.1)",border:"none",cursor:"pointer",alignItems:"center",justifyContent:"center",position:"relative" }} id="mobile-cart-btn">
            🛒
            {cartCount>0 && <span style={{ position:"absolute",top:-4,right:-4,width:16,height:16,background:C.accent,borderRadius:"50%",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", minHeight:0 }}>

        {/* ── Left: Products ───────────────────────────────────────────────── */}
        <main style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Category tabs */}
          <div style={{ padding:"12px 16px 10px", flexShrink:0 }}>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
              {CATEGORIES.map(c=>(
                <button key={c.id} onClick={()=>setActiveCat(c.id)}
                  className={`cat-pill ${activeCat===c.id?"active":"inactive"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
            {filtered.length===0 ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:200,color:C.muted,gap:8 }}>
                <span style={{ fontSize:40 }}>🔍</span>
                <span style={{ fontSize:14,fontWeight:500 }}>No products found</span>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12 }}>
                {filtered.map((p,i)=>{
                  const [g1,g2] = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                  return (
                    <div key={p.id} onClick={()=>handleAdd(p)}
                      className={`prod-card${addedId===p.id?" pop":""}`}
                      style={{ background:"#fff", borderRadius:16, border:`1.5px solid ${C.border}`, overflow:"hidden" }}>
                      {/* Image area */}
                      <div style={{ background:`linear-gradient(135deg, ${g1}, ${g2})`, aspectRatio:"4/3", display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
                        <span style={{ fontSize:36, opacity:.6, userSelect:"none" }}>{p.emoji}</span>
                        {/* Add badge */}
                        <div style={{ position:"absolute",bottom:8,right:8,width:24,height:24,background:C.brand,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .15s" }} className="add-icon">
                          <span style={{ color:"#fff",fontSize:14,lineHeight:1 }}>+</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div style={{ padding:"10px 10px 12px" }}>
                        <div style={{ fontSize:12,fontWeight:600,color:C.text,lineHeight:1.3,marginBottom:4 }}>{p.name}</div>
                        <div style={{ fontSize:14,fontWeight:800,color:C.brand }}>{fmt(p.price)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, background:C.bg, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ghost-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                History
              </button>
              <button className="ghost-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Customers
              </button>
            </div>
            <span style={{ fontSize:12, color:C.muted }}>{filtered.length} item{filtered.length!==1?"s":""}</span>
          </div>
        </main>

        {/* ── Right: Cart ──────────────────────────────────────────────────── */}
        <aside style={{ width:340, flexShrink:0, borderLeft:`1px solid ${C.border}`, background:"#fff", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <CartPanel
            state={state} dispatch={dispatch}
            subtotal={subtotal} tax={tax} total={total}
            onCheckout={()=>setCheckout(true)}
          />
        </aside>
      </div>

      {/* ── Checkout Modal ───────────────────────────────────────────────────── */}
      {checkout && (
        <CheckoutModal
          state={state} dispatch={dispatch}
          subtotal={subtotal} tax={tax} total={total}
          onClose={()=>{ setCheckout(false); }}
          onSuccess={()=>{ setCheckout(false); dispatch({type:"CLEAR"}); }}
        />
      )}
    </div>
  );
}

// ─── Cart Panel ───────────────────────────────────────────────────────────────
function CartPanel({ state, dispatch, subtotal, tax, total, onCheckout }) {
  const [promoOpen, setPromoOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>

      {/* Customer */}
      <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8 }}>Selected Customer</div>
        {state.customer ? (
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#EEF2FF",borderRadius:12,border:`1px solid #C7D2FE` }}>
            <div style={{ width:30,height:30,borderRadius:"50%",background:C.brand,color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              {state.customer.name[0]}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{state.customer.name}</div>
              <div style={{ fontSize:10,color:C.brandMid }}>{state.customer.pts} loyalty pts</div>
            </div>
            <button onClick={()=>dispatch({type:"SET_CUST",c:null})} style={{ background:"none",border:"none",cursor:"pointer",color:C.muted,padding:2,borderRadius:4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          <CustomerDropdown onSelect={c=>dispatch({type:"SET_CUST",c})} />
        )}
      </div>

      {/* Cart Items */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {state.items.length===0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.muted,gap:10 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:2 }}>Cart is empty</div>
              <div style={{ fontSize:11,color:"#9CA3AF" }}>Click a product to add it</div>
            </div>
          </div>
        ) : (
          state.items.map(item=>(
            <div key={item.id} className="cart-item">
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:600,color:C.text,marginBottom:2 }}>{item.name}</div>
                <div style={{ fontSize:11,color:C.muted }}>{fmt(item.price)} / unit</div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <button className="qty-btn" onClick={()=>dispatch({type:"DEC",id:item.id,qty:item.qty})}>−</button>
                <span style={{ fontSize:13,fontWeight:700,color:C.text,width:20,textAlign:"center",tabularNums:true }}>{item.qty}</span>
                <button className="qty-btn" onClick={()=>dispatch({type:"INC",id:item.id})}>+</button>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:C.text,width:48,textAlign:"right" }}>{fmt(item.price*item.qty)}</div>
              <button className="del-btn" onClick={()=>dispatch({type:"DEL",id:item.id})}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, padding:"14px 16px 0" }}>
        <Row label="Subtotal" value={fmt(subtotal)} />
        <Row label="Tax (8%)" value={fmt(tax)} />
        {state.discount>0 && (
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
            <span style={{ fontSize:13,fontWeight:600,color:C.brand }}>
              <span className="tag-badge" style={{ marginRight:4 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                {state.discountCode}
              </span>
              Discount
            </span>
            <span style={{ fontSize:13,fontWeight:700,color:C.brand }}>−{fmt(state.discount)}</span>
          </div>
        )}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4 }}>
          <span style={{ fontSize:15,fontWeight:700,color:C.text }}>Total</span>
          <span style={{ fontSize:26,fontWeight:900,color:C.brand,letterSpacing:"-1px",fontFamily:"'DM Mono',monospace" }}>{fmt(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ flexShrink:0, padding:"12px 16px" }}>
        <div style={{ display:"flex",gap:8,marginBottom:10 }}>
          <button
            onClick={()=>setPromoOpen(v=>!v)}
            className="ghost-btn"
            style={{ flex:1,justifyContent:"center", ...(state.discount>0?{background:"#EEF2FF",borderColor:"#C7D2FE",color:C.brand}:{}) }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            {state.discount>0 ? "Promo ✓" : "Promo"}
          </button>
        </div>

        {promoOpen && <PromoBox state={state} dispatch={dispatch} onClose={()=>setPromoOpen(false)} />}

        <button className="checkout-btn" disabled={state.items.length===0} onClick={onCheckout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          Checkout
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
      <span style={{ fontSize:13,color:C.muted }}>{label}</span>
      <span style={{ fontSize:13,fontWeight:600,color:C.text }}>{value}</span>
    </div>
  );
}

// ─── Customer Dropdown ────────────────────────────────────────────────────────
function CustomerDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(()=>{
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  }, []);

  const filtered = CUSTOMERS.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={()=>setOpen(v=>!v)} style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:C.surface2,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",color:C.muted,fontSize:13,fontFamily:"inherit" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style={{ flex:1,textAlign:"left" }}>Select customer…</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .15s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position:"absolute",left:0,right:0,top:"calc(100% + 6px)",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.12)",zIndex:50,overflow:"hidden" }}>
          <div style={{ padding:8,borderBottom:`1px solid ${C.border}` }}>
            <input id="checkout-customer-search-input" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="input-field" style={{ padding:"7px 12px",fontSize:13 }} />
          </div>
          <ul style={{ maxHeight:160,overflowY:"auto",listStyle:"none" }}>
            {filtered.map(c=>(
              <li key={c.id}>
                <button onClick={()=>{ onSelect(c); setOpen(false); setQ(""); }} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F5F4FF"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:"#EEF2FF",color:C.brand,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{c.name[0]}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{c.name}</div>
                    <div style={{ fontSize:11,color:C.muted }}>{c.email}</div>
                  </div>
                  <span style={{ fontSize:10,fontWeight:600,color:C.brandMid,flexShrink:0 }}>{c.pts} pts</span>
                </button>
              </li>
            ))}
            {filtered.length===0 && <li style={{ padding:"14px",textAlign:"center",fontSize:13,color:C.muted }}>No customers found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Promo Box ────────────────────────────────────────────────────────────────
function PromoBox({ state, dispatch, onClose }) {
  if (state.discount>0) return (
    <div style={{ padding:"10px 12px",background:"#EEF2FF",borderRadius:10,border:`1px solid #C7D2FE`,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <span style={{ fontSize:13,fontWeight:600,color:C.brand }}>✓ {state.discountCode} — −{fmt(state.discount)}</span>
      <button onClick={()=>{ dispatch({type:"PROMO_REMOVE"}); onClose(); }} style={{ fontSize:11,color:C.danger,background:"none",border:"none",cursor:"pointer",fontWeight:600 }}>Remove</button>
    </div>
  );
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",gap:6 }}>
        <input id="checkout-promo-input" value={state.promoInput} onChange={e=>dispatch({type:"PROMO_IN",v:e.target.value})} placeholder="Enter promo code" className="input-field"
          onKeyDown={e=>e.key==="Enter"&&dispatch({type:"PROMO_APPLY"})} style={{ flex:1,fontSize:13 }} />
        <button onClick={()=>dispatch({type:"PROMO_APPLY"})} style={{ padding:"8px 14px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Apply</button>
      </div>
      {state.promoError && <div style={{ fontSize:11,color:C.danger,marginTop:4 }}>{state.promoError}</div>}
      <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Try: SAVE250 · WELCOME5 · LOYALTY10</div>
    </div>
  );
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────
function CheckoutModal({ state, dispatch, subtotal, tax, total, onClose, onSuccess }) {
  const [method, setMethod] = useState("cash");
  const [cash, setCash] = useState("");
  const [step, setStep] = useState("pay"); // pay | success
  const [orderId] = useState(genId);

  const cashAmt = parseFloat(cash)||0;
  const change = Math.max(0, cashAmt-total);
  const canPay = method!=="cash" || cashAmt>=total;

  const confirm = () => setStep("success");

  const printReceipt = () => {
    try {
      const receiptWindow = window.open("", "_blank", "width=700,height=900");
      if (!receiptWindow) return alert("Unable to open print window. Please allow popups.");

      const now = new Date();
      const itemsHtml = state.items.map(i => `
        <tr>
          <td style="padding:6px 8px">${i.name} × ${i.qty}</td>
          <td style="padding:6px 8px;text-align:right">${fmt(i.price * i.qty)}</td>
        </tr>
      `).join("");

      const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ${orderId}</title>
          <style>
            body{font-family:Inter, Arial, Helvetica, sans-serif;color:#111;margin:0;padding:24px;background:#fff}
            .wrap{display:flex;gap:24px;align-items:flex-start}
            .details{flex:1}
            .receipt{width:320px;border:4px solid #24106d;padding:16px}
            .brand{font-weight:800;color:#24106d;margin-bottom:8px}
            .muted{color:#6b7280;font-size:12px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            td{font-size:13px}
            .total{font-weight:800;font-size:16px;margin-top:10px}
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="details">
              <h2 style="margin:0;color:#111">Payment Successful!</h2>
              <div class="muted">Transaction completed successfully. A copy has been saved to records.</div>
              <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #eef2ff">
                <div style="font-size:13px;color:#374151"><strong>Transaction Details</strong></div>
                <div style="margin-top:8px;font-size:13px">Receipt: <strong>#${orderId}</strong></div>
                <div style="margin-top:6px;font-size:13px">Date & Time: <strong>${now.toLocaleString()}</strong></div>
                <div style="margin-top:6px;font-size:13px">Payment Method: <strong>${method.charAt(0).toUpperCase()+method.slice(1)}</strong></div>
              </div>
              <div style="margin-top:12px;display:flex;gap:8px">
                <button onclick="window.print()" style="padding:10px 14px;border-radius:8px;border:1px solid #e6edf8;background:#fff;cursor:pointer">Print Receipt</button>
                <button onclick="alert('Send email - implement server integration')" style="padding:10px 14px;border-radius:8px;border:1px solid #e6edf8;background:#fff;cursor:pointer">Send Email</button>
              </div>
            </div>

            <div class="receipt">
              <div class="brand">COFFEE & BLOOM</div>
              <div class="muted">123 Market Street, Suite 500<br/>San Francisco, CA 94103<br/>Tel: (555) 012-3456</div>
              <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
              <div style="font-size:13px">Receipt: <strong>#${orderId}</strong></div>
              <div style="font-size:13px">Date: <strong>${now.toLocaleDateString()}</strong></div>
              <div style="font-size:13px">Time: <strong>${now.toLocaleTimeString()}</strong></div>

              <table>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px">
                <div style="display:flex;justify-content:space-between;font-size:13px"><div>SUBTOTAL</div><div>${fmt(subtotal)}</div></div>
                <div style="display:flex;justify-content:space-between;font-size:13px"><div>TAX (8%)</div><div>${fmt(tax)}</div></div>
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;margin-top:6px"><div>TOTAL</div><div>${fmt(total)}</div></div>
                ${method === 'cash' && cashAmt>0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px"><div>Cash Tendered</div><div>${fmt(cashAmt)}</div></div>` : ''}
                ${method === 'cash' && cashAmt>total ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px"><div>Change Due</div><div>${fmt(Math.max(0,cashAmt-total))}</div></div>` : ''}
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
      setTimeout(()=>{ receiptWindow.print(); }, 600);
    } catch (err) {
      console.error(err);
      alert('Printing failed');
    }
  };
  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 16px",borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:16,fontWeight:800,color:C.text,letterSpacing:"-.3px" }}>{step==="success"?"Order Complete ✓":"Checkout"}</span>
          <button onClick={step==="success"?onSuccess:onClose} style={{ width:28,height:28,borderRadius:"50%",background:"#F3F4F6",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {step==="pay" ? (
          <div style={{ padding:"18px 20px 20px", display:"flex", flexDirection:"column", gap:16 }}>
            {/* Order summary */}
            <div style={{ background:C.surface2,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}` }}>
              {state.items.map(i=>(
                <div key={i.id} style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6 }}>
                  <span style={{ color:C.muted }}>{i.name} × {i.qty}</span>
                  <span style={{ fontWeight:600 }}>{fmt(i.price*i.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop:`1px solid ${C.border}`,marginTop:8,paddingTop:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:4 }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:4 }}>
                  <span>Tax (8%)</span><span>{fmt(tax)}</span>
                </div>
                {state.discount>0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.brand,fontWeight:600,marginBottom:4 }}>
                    <span>Discount ({state.discountCode})</span><span>−{fmt(state.discount)}</span>
                  </div>
                )}
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800,marginTop:6 }}>
                  <span style={{ color:C.text }}>Total</span>
                  <span style={{ color:C.brand,fontFamily:"'DM Mono',monospace" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:10 }}>Payment Method</div>
              <div style={{ display:"flex",gap:8 }}>
                {[
                  { id:"cash",    label:"Cash",    icon:"💵" },
                ].map(m=>(
                  <button key={m.id} onClick={()=>setMethod(m.id)} className={`pay-btn ${method===m.id?"active":""}`}>
                    <span style={{ fontSize:20 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash tendered */}
            {method==="cash" && (
              <div>
                <div style={{ fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8 }}>Cash Tendered</div>
                <input id="checkout-cash-input" type="number" value={cash} onChange={e=>setCash(e.target.value)} placeholder={total.toFixed(2)} className="input-field" style={{ fontFamily:"'DM Mono',monospace",fontSize:15 }} />
                {cashAmt>=total && cashAmt>0 && (
                  <div style={{ marginTop:6,fontSize:13,fontWeight:700,color:C.success }}>Change: {fmt(change)}</div>
                )}
              </div>
            )}

            {/* Confirm */}
            <button className="checkout-btn" disabled={!canPay} onClick={confirm} style={{ marginTop:4 }}>
              Confirm Payment · {fmt(total)}
            </button>
          </div>
        ) : (
          /* Success */
          <div style={{ padding:"28px 24px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <div className="success-check">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18,fontWeight:800,color:C.text,marginBottom:4 }}>Payment Successful!</div>
              <div style={{ fontSize:12,color:C.muted }}>Order <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.text }}>{orderId}</span></div>
            </div>
            <div style={{ width:"100%",background:C.surface2,borderRadius:12,padding:"12px 16px",border:`1px solid ${C.border}` }}>
              <Row label="Total Paid" value={fmt(total)} />
              <Row label="Method" value={method.charAt(0).toUpperCase()+method.slice(1)} />
              {method==="cash" && cashAmt>total && <Row label="Change" value={fmt(change)} />}
              {state.customer && <Row label="Customer" value={state.customer.name} />}
            </div>
            <div style={{ display:"flex",gap:8,width:"100%" }}>
              <button className="ghost-btn" style={{ flex:1,justifyContent:"center" }} onClick={printReceipt}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/></svg>
                Print Receipt
              </button>
              <button className="checkout-btn" onClick={onSuccess} style={{ flex:1 }}>
                New Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}