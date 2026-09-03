"use client";
import { C } from "../constants/tokens";
import { useState } from "react";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  unit: string;
  weight: number | null;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints?: number;
}

// Props for the CartSidebar component, including cart items, customer info, totals, and event handlers
interface CartSidebarProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  customerSearch: string;
  showCustomerDropdown: boolean;
  subtotal: number;
  total: number;
  discount: number;
  promoCode: string;
  loyaltyDiscount: number;
  loyaltyPointsUsed: number;
  error: string;
  // Event handlers for customer search, selection, quantity updates, cart clearing, promo code application, points redemption, and checkout
  onCustomerSearch: (val: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  onShowCustomerDropdown: (val: boolean) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClearCart: () => void;
  onShowPromo: () => void;
  onRedeemPoints: (points: number) => void;
  onCheckout: () => void;
}

export default function CartSidebar({
  cart,
  customers,
  selectedCustomer,
  customerSearch,
  showCustomerDropdown,
  subtotal,
  total,
  discount,
  promoCode,
  loyaltyDiscount,
  loyaltyPointsUsed,
  error,
  onCustomerSearch,
  onSelectCustomer,
  onClearCustomer,
  onShowCustomerDropdown,
  onUpdateQty,
  onClearCart,
  onShowPromo,
  onRedeemPoints,
  onCheckout,
}: CartSidebarProps) {
  const [redeemInput, setRedeemInput] = useState("");

  // Helper function to filter customers based on search input, matching telephone number only
  const filterCustomers = (list: Customer[], search: string) => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(c =>
      c.phone?.toLowerCase().includes(term)
    );
  };

  return (
    <aside className="w-[300px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-extrabold text-gray-800">Cart</span>
          {cart.length > 0 && (
            <div
              className="text-white rounded-full px-2 py-[1px] text-[11px] font-bold"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded hover:bg-red-200 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Customer */}
      <div className="relative px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Customer</div>

        {selectedCustomer ? (
          <div>
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-100 rounded-lg border border-gray-200">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {selectedCustomer.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-gray-800 truncate">{selectedCustomer.name}</div>
                <div className="text-[10px] text-gray-500">{selectedCustomer.phone}</div>
              </div>
              <button onClick={onClearCustomer} className="p-1 text-gray-500 hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Loyalty Points Badge */}
            {selectedCustomer._id !== 'guest' && (
              <div className="mt-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">⭐</span>
                    <span className="text-[11px] font-bold text-amber-700">
                      {selectedCustomer.loyaltyPoints ?? 0} pts
                    </span>
                    <span className="text-[10px] text-amber-600">available</span>
                  </div>
                  {loyaltyDiscount > 0 && (
                    <button
                      onClick={() => { setRedeemInput(""); onRedeemPoints(0); }}
                      className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 transition"
                    >
                      Remove ✕
                    </button>
                  )}
                </div>

                {loyaltyDiscount > 0 ? (
                  <div className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded text-center">
                    ✓ {loyaltyPointsUsed} pts applied (−Rs. {loyaltyDiscount.toLocaleString()})
                  </div>
                ) : (selectedCustomer.loyaltyPoints ?? 0) > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      min="1"
                      max={selectedCustomer.loyaltyPoints ?? 0}
                      placeholder={`1 – ${selectedCustomer.loyaltyPoints ?? 0}`}
                      value={redeemInput}
                      onChange={e => setRedeemInput(e.target.value)}
                      className="flex-1 border border-amber-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    />
                    <button
                      onClick={() => {
                        const pts = Math.min(
                          Math.max(1, parseInt(redeemInput, 10) || 0),
                          selectedCustomer.loyaltyPoints ?? 0,
                          Math.floor(subtotal - discount),
                        );
                        if (pts > 0) { onRedeemPoints(pts); setRedeemInput(String(pts)); }
                      }}
                      className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition whitespace-nowrap"
                    >
                      Redeem
                    </button>
                    <button
                      onClick={() => {
                        const max = Math.min(
                          selectedCustomer.loyaltyPoints ?? 0,
                          Math.floor(subtotal - discount),
                        );
                        setRedeemInput(String(max));
                        onRedeemPoints(max);
                      }}
                      className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition whitespace-nowrap"
                    >
                      All
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by phone number..."
              value={customerSearch}
              onChange={e => { onCustomerSearch(e.target.value); onShowCustomerDropdown(true); }}
              onFocus={() => onShowCustomerDropdown(true)}
              className="w-full border border-gray-200 rounded-lg px-7 py-1.5 text-[13px] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
            />
          </div>
        )}

        {/* Dropdown */}
        {showCustomerDropdown && !selectedCustomer && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-[220px] overflow-y-auto">
            {/* Guest */}
            <div
              onClick={() => onSelectCustomer({ _id: "guest", name: "Guest Customer", email: "", phone: "", avatar: "G", totalOrders: 0, totalSpent: 0, loyaltyPoints: 0 })}
              className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-gray-100 border-b border-gray-200"
            >
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-500">G</div>
              <div>
                <div className="text-[12px] font-bold text-gray-800">Guest Customer</div>
                <div className="text-[10px] text-gray-500">No account needed</div>
              </div>
            </div>

            {/* Filtered Customers */}
            {filterCustomers(customers, customerSearch).map(c => (
              <div
                key={c._id}
                onClick={() => onSelectCustomer(c)}
                className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-gray-100 border-b border-gray-200"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-gray-800 truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-500">{c.phone} · {c.totalOrders} orders</div>
                </div>
                {(c.loyaltyPoints ?? 0) > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-[9px] font-bold text-amber-600">⭐ {c.loyaltyPoints} pts</div>
                  </div>
                )}
              </div>
            ))}

            {filterCustomers(customers, customerSearch).length === 0 && customerSearch && (
              <div className="text-center text-[12px] text-gray-500 p-3">No customers found</div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <div className="w-18 h-18 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.brandLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-[14px] font-bold text-gray-800 mb-1">Cart is empty</div>
              <div className="text-[12px] text-gray-500">Click a product to add it</div>
            </div>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-light, #eff4ff)", color: "var(--color-primary)" }}
              >
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate mb-0.5">{item.name}</div>
                <div className="text-[11px] text-gray-500">Rs. {item.price.toLocaleString()} / {item.unit || "unit"}</div>
              </div>
              {item.unit === "kg" ? (
                <div className="flex items-center">
                  <span className="text-[12px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    {item.qty} kg
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300" onClick={() => onUpdateQty(item.id, -1)}>−</button>
                  <span className="text-[13px] font-bold text-gray-800 w-5 text-center">{item.qty}</span>
                  <button className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300" onClick={() => onUpdateQty(item.id, 1)}>+</button>
                </div>
              )}
              <div className="text-[12px] font-bold text-gray-800 w-14 text-right">Rs. {parseFloat((item.price * item.qty).toFixed(2)).toLocaleString()}</div>
              <button className="p-1 text-gray-500 hover:text-red-500" onClick={() => onUpdateQty(item.id, -item.qty)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 pt-3">
        <div className="flex justify-between mb-1">
          <span className="text-[12px] text-gray-500">Subtotal</span>
          <span className="text-[12px] font-semibold text-gray-800">Rs. {subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between mb-1">
            <span className="text-[12px] font-semibold text-green-600">Discount ({promoCode})</span>
            <span className="text-[12px] font-bold text-green-600">−Rs. {discount.toFixed(2)}</span>
          </div>
        )}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between mb-1">
            <span className="text-[12px] font-semibold text-amber-600">⭐ Loyalty ({loyaltyPointsUsed} pts)</span>
            <span className="text-[12px] font-bold text-amber-600">−Rs. {loyaltyDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-gray-200 mt-1 pt-2">
          <span className="text-[14px] font-bold text-gray-800">Total</span>
          <span
            className="text-[22px] font-extrabold tracking-[-1px] font-mono"
            style={{ color: "var(--color-primary)" }}
          >
            Rs. {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2">
          <div className="bg-red-100 border border-red-200 rounded-lg p-2">
            <p className="text-[12px] text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 px-4 py-3">
        <button className="w-full flex items-center justify-center mb-2 px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition" onClick={onShowPromo}>
          <svg className="mr-1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {discount > 0 ? `Promo Applied: −Rs. ${discount.toFixed(2)}` : "Apply Promo Code"}
        </button>

        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-white font-bold transition shadow-sm ${
            cart.length === 0 ? "bg-gray-400 cursor-not-allowed" : "hover:brightness-95 cursor-pointer"
          }`}
          style={{
            backgroundColor: cart.length === 0 ? undefined : "var(--color-primary)",
          }}
        >
          <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          {cart.length === 0 ? "CHECKOUT" : `CHECKOUT · Rs. ${total.toLocaleString()}`}
        </button>
      </div>
    </aside>
  );
}