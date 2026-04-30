"use client";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useStore } from "@/app/contexts/StoreContext";
import api from "@/app/lib/api";
import { getPendingCount } from "@/app/lib/offlineDB";
import { syncPendingTransactions } from "@/app/lib/syncManager";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useCartState } from "@/app/hooks/useCartState";
import { useCustomerManagement } from "@/app/hooks/useCustomerManagement";
import { useDiscounts } from "@/app/hooks/useDiscounts";
import { usePromoCode } from "@/app/hooks/usePromoCode";
import { useWeightModal } from "@/app/hooks/useWeightModal";
import { useProductsData } from "@/app/hooks/useProductsData";
import { useSyncState } from "@/app/hooks/useSyncState";
import { usePOSUI } from "@/app/hooks/usePOSUI";
import { fmt, genId } from "./constants/pos"; 
import CheckoutModal from "./components/CheckoutModal";
import WeightModal from "./components/WeightModal";
import PromoModal from "./components/PromoModal";
import ProductCard from "./components/ProductCard";
import CartSidebar from "./components/CartSidebar";
import TopBar from "./components/TopBar";


interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  category: string;
  stock: number;
  status: string;
  lowStockThreshold: number;
  isWeightBased: boolean;
  unit: string;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
}

// Main POS Dashboard component that handles product listing, cart management, customer selection, and checkout flow
export default function POSDashboard() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const { storeName } = useStore();

  // Custom hooks for state management
  const { cart, setCart, addedId, setAddedId, showCheckout, setShowCheckout } = useCartState();
  const { selectedCustomer, setSelectedCustomer, customers, setCustomers, customerSearch, setCustomerSearch, showCustomerDropdown, setShowCustomerDropdown } = useCustomerManagement();
  const { discount, setDiscount, loyaltyDiscount, setLoyaltyDiscount, loyaltyPointsUsed, setLoyaltyPointsUsed, promoCode, setPromoCode } = useDiscounts(cart);
  const { showPromo, setShowPromo, promoInput, setPromoInput, promoLoading, setPromoLoading, promoError, setPromoError, promoSuccess, setPromoSuccess } = usePromoCode();
  const { showWeightModal, setShowWeightModal, weightProduct, setWeightProduct, weightInput, setWeightInput, weightError, setWeightError } = useWeightModal();
  const { products, setProducts, categories, setCategories, loadingData, setLoadingData, activeCategory, setActiveCategory, search, setSearch } = useProductsData();
  const { pendingCount, setPendingCount, syncing, setSyncing, syncMessage, setSyncMessage } = useSyncState();
  const { showMenu, setShowMenu, time, error, setError } = usePOSUI();


  // Redirect to login if not authenticated, or to main dashboard if user role is not cashier
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'Cashier' && user.role !== 'Sales Representative') router.replace('/dashboard');
  }, [user, authLoading, router]);

  // Fetch products, categories, and customers on mount
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, customersRes] = await Promise.all([
          api.get("/products"),
          api.get("/categories"),
          api.get("/customers"),
        ]);
        setProducts(productsRes.data.data);
        setCategories(categoriesRes.data.data);
        setCustomers(customersRes.data.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
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

  // Refresh pending transaction count on mount and after every sync
  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // Automatically sync pending transactions when back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) handleSync();
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      const { synced, failed } = await syncPendingTransactions();
      await refreshPendingCount();
      if (synced > 0) setSyncMessage(`✓ ${synced} transaction${synced > 1 ? "s" : ""} synced!`);
      if (failed > 0) setSyncMessage(`⚠ ${failed} failed to sync`);
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (err) {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => { logout(); router.push("/pos/login"); };

  // ── Loyalty Points Redeem ─────────────────────────────────────────────────
  const handleRedeemPoints = async () => {
    if (!selectedCustomer || selectedCustomer._id === "guest") return;
    const availablePoints = selectedCustomer.loyaltyPoints ?? 0;
    if (availablePoints <= 0) return;

    // Cap redemption at remaining order total after promo discount
    const maxRedeemable = Math.floor(subtotal - discount);
    const pointsToRedeem = Math.min(availablePoints, maxRedeemable);
    if (pointsToRedeem <= 0) return;

    try {
      await api.post(`/customers/${selectedCustomer._id}/redeem-points`, { points: pointsToRedeem });
      setLoyaltyDiscount(pointsToRedeem);
      setLoyaltyPointsUsed(pointsToRedeem);
      // Update points locally so UI reflects immediately
      const updatedCustomer = { ...selectedCustomer, loyaltyPoints: availablePoints - pointsToRedeem };
      setSelectedCustomer(updatedCustomer);
      setCustomers(prev => prev.map(c => c._id === selectedCustomer._id ? updatedCustomer : c));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to redeem points");
    }
  };

  const subtotal = cart.reduce((acc, item) => {
    if (item.unit === "kg") return acc + item.price; // price for weight-based items is already qty * unit price, so just add it directly
    return acc + item.price * item.qty;// for regular items, multiply price by quantity
  }, 0);
  const total = parseFloat((subtotal - discount - loyaltyDiscount).toFixed(2));

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
      return [...prev, { id: product._id, name: product.name, sku: product.sku, price: product.sellingPrice, qty: 1, unit: "item", weight: null }];
    });
    setAddedId(product._id);
    setTimeout(() => setAddedId(null), 350);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  };

  const refreshProducts = useCallback(async () => {
    try {
      const productsRes = await api.get("/products");
      setProducts(productsRes.data.data);
    } catch (err) {
      console.error("Failed to refresh products:", err);
    }
  }, []);

  const handleCheckoutSuccess = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setDiscount(0);
    setPromoCode("");
    setLoyaltyDiscount(0);
    setLoyaltyPointsUsed(0);
    setShowCheckout(false);
    refreshPendingCount();
    refreshProducts(); // Refresh inventory to show updated stock levels
  };

  const checkoutState = {
    items: cart,
    customer: selectedCustomer,
    discount,
    discountCode: promoCode,
    loyaltyDiscount,
    loyaltyPointsUsed,
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0F2F8]">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 border-[3px] border-[#1B1A55] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F0F2F8] font-sans">

      <TopBar
        storeName={storeName}
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

      <div className="flex flex-1 min-h-0">

        {/* ── Product Area ─────────────────────────────────────────────────── */}
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">

          {/* Category Pills */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["All", ...categories.map(c => c.name)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] whitespace-nowrap transition-all duration-150 ${
                    activeCategory === cat
                      ? "bg-[#1B1A55] text-white border-transparent"
                      : "bg-white text-[#6B7280] border-[#E3E6F0] hover:border-[#9290C3] hover:text-[#1B1A55]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-[#6B7280]">
                <span className="text-[40px]">🔍</span>
                <span className="text-sm font-medium">No products found</span>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
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

          {/* Bottom Bar */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-2 border-t border-[#E3E6F0] bg-[#F0F2F8]">
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/pos/transactions")}
                className="flex items-center gap-1.5 bg-transparent border-[1.5px] border-[#E3E6F0] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#6B7280] transition-all hover:border-[#9290C3] hover:text-[#1B1A55] hover:bg-[#F5F4FF]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                History
              </button>
              <button
                onClick={() => router.push("/pos/Customers")}
                className="flex items-center gap-1.5 bg-transparent border-[1.5px] border-[#E3E6F0] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-[#6B7280] transition-all hover:border-[#9290C3] hover:text-[#1B1A55] hover:bg-[#F5F4FF]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Customers
              </button>
            </div>
            <span className="text-xs text-[#6B7280]">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </main>

        {/* ── Cart Sidebar ─────────────────────────────────────────────────── */}
        <CartSidebar
          cart={cart}
          customers={customers}
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          showCustomerDropdown={showCustomerDropdown}
          subtotal={subtotal}
          total={total}
          discount={discount}
          promoCode={promoCode}
          loyaltyDiscount={loyaltyDiscount}
          loyaltyPointsUsed={loyaltyPointsUsed}
          error={error}
          onCustomerSearch={setCustomerSearch}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c);
            setShowCustomerDropdown(false);
            setCustomerSearch("");
            // Reset loyalty if customer changes
            setLoyaltyDiscount(0);
            setLoyaltyPointsUsed(0);
          }}
          onClearCustomer={() => {
            setSelectedCustomer(null);
            setCustomerSearch("");
            setLoyaltyDiscount(0);
            setLoyaltyPointsUsed(0);
          }}
          onShowCustomerDropdown={setShowCustomerDropdown}
          onUpdateQty={updateQty}
          onClearCart={() => {
            setCart([]);
            setDiscount(0);
            setPromoCode("");
            setLoyaltyDiscount(0);
            setLoyaltyPointsUsed(0);
            setSelectedCustomer(null);
          }}
          onShowPromo={() => { setShowPromo(true); setPromoError(""); setPromoSuccess(""); }}
          onRedeemPoints={handleRedeemPoints}
          onCheckout={() => {
            if (cart.length === 0) { setError("Cart is empty"); return; }
            setError("");
            setShowCheckout(true);
          }}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showCheckout && (
        <CheckoutModal
          state={checkoutState}
          subtotal={subtotal}
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
          onPromoInputChange={(val) => { setPromoInput(val); setPromoError(""); setPromoSuccess(""); }}
          onApply={async () => {
            setPromoLoading(true);
            setPromoError("");
            setPromoSuccess("");
            try {
              const { data } = await api.post("/promos/validate", { code: promoInput, orderAmount: subtotal });
              setDiscount(data.data.discountAmount);
              setPromoCode(data.data.code);
              setPromoSuccess(data.data.message);
            } catch (err: any) {
              setPromoError(err.response?.data?.message || "Invalid promo code");
            } finally {
              setPromoLoading(false);
            }
          }}
          onRemove={() => { setDiscount(0); setPromoCode(""); setPromoInput(""); setPromoSuccess(""); }}
          onClose={() => { setShowPromo(false); setPromoError(""); setPromoSuccess(""); }}
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
                sku: weightProduct.sku,
                price: totalPrice,
                qty: 1,
                unit: "kg",
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