"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { getPendingCount } from "@/app/lib/offlineDB";
import { syncPendingTransactions } from "@/app/lib/syncManager";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { C, CARD_GRADIENTS } from "./constants/tokens";
import { TAX_RATE, fmt, genId } from "./constants/pos";
import CheckoutModal from "./components/CheckoutModal";
import WeightModal from "./components/WeightModal";
import PromoModal from "./components/PromoModal";
import ProductCard from "./components/ProductCard";
import CartSidebar from "./components/CartSidebar";
import TopBar from "./components/TopBar";

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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

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

      <TopBar
        user={user}
        time={time}
        isOnline={isOnline}
        search={search}
        pendingCount={pendingCount}
        syncing={syncing}
        syncMessage={syncMessage}
        showMenu={showMenu}
        onSearch={setSearch}
        onSync={handleSync}
        onToggleMenu={() => setShowMenu(v => !v)}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

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
                  const inCart = cart.find(c => c.id === product._id);
                  return (
                    <ProductCard
                      key={product._id}
                      product={product}
                      index={i}
                      inCart={!!inCart}
                      cartQty={inCart?.qty ?? 0}
                      addedId={addedId}
                      onAdd={addToCart}
                    />
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

        <CartSidebar
          cart={cart}
          customers={customers}
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          showCustomerDropdown={showCustomerDropdown}
          subtotal={subtotal}
          tax={tax}
          total={total}
          discount={discount}
          promoCode={promoCode}
          error={error}
          onCustomerSearch={setCustomerSearch}
          onSelectCustomer={(c) => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(""); }}
          onClearCustomer={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
          onShowCustomerDropdown={setShowCustomerDropdown}
          onUpdateQty={updateQty}
          onClearCart={() => { setCart([]); setDiscount(0); setPromoCode(""); setSelectedCustomer(null); }}
          onShowPromo={() => { setShowPromo(true); setPromoError(""); setPromoSuccess(""); }}
          onCheckout={() => {
            if (cart.length === 0) { setError("Cart is empty"); return; }
            setError("");
            setShowCheckout(true);
          }}
        />
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

      {showPromo && (
        <PromoModal
          subtotal={subtotal}
          discount={discount}
          promoCode={promoCode}
          promoInput={promoInput}
          promoLoading={promoLoading}
          promoError={promoError}
          promoSuccess={promoSuccess}
          onPromoInputChange={(val) => {
            setPromoInput(val);
            setPromoError("");
            setPromoSuccess("");
          }}
          onApply={async () => {
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
          onRemove={() => {
            setDiscount(0);
            setPromoCode("");
            setPromoInput("");
            setPromoSuccess("");
          }}
          onClose={() => {
            setShowPromo(false);
            setPromoError("");
            setPromoSuccess("");
          }}
        />
      )}

      {showWeightModal && weightProduct && (
        <WeightModal
          product={weightProduct}
          weightInput={weightInput}
          weightError={weightError}
          onWeightChange={(val) => { setWeightInput(val); setWeightError(""); }}
          onClose={() => setShowWeightModal(false)}
          onAdd={() => {
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
        />
      )}
    </div>
  );
}