import { C } from "../constants/tokens";
import api from "@/app/lib/api";

interface CartItem {
  id: string;
  name: string;
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
}

interface CartSidebarProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  customerSearch: string;
  showCustomerDropdown: boolean;
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  promoCode: string;
  error: string;
  onCustomerSearch: (val: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  onShowCustomerDropdown: (val: boolean) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClearCart: () => void;
  onShowPromo: () => void;
  onCheckout: () => void;
}

export default function CartSidebar({
  cart,
  customers,
  selectedCustomer,
  customerSearch,
  showCustomerDropdown,
  subtotal,
  tax,
  total,
  discount,
  promoCode,
  error,
  onCustomerSearch,
  onSelectCustomer,
  onClearCustomer,
  onShowCustomerDropdown,
  onUpdateQty,
  onClearCart,
  onShowPromo,
  onCheckout,
}: CartSidebarProps) {
  return (
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
            onClick={onClearCart}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#F0F2F8", borderRadius: 10, border: `1.5px solid ${C.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {selectedCustomer.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{selectedCustomer.phone}</div>
            </div>
            <button
              onClick={onClearCustomer}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={e => { onCustomerSearch(e.target.value); onShowCustomerDropdown(true); }}
              onFocus={() => onShowCustomerDropdown(true)}
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
              onClick={() => { onSelectCustomer({ _id: "guest", name: "Guest Customer", email: "", phone: "", avatar: "G", totalOrders: 0, totalSpent: 0 }); }}
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
                  onClick={() => { onSelectCustomer(c); }}
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
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E8ECF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.brand, flexShrink: 0 }}>
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Rs. {item.price.toLocaleString()} / unit</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <button className="qty-btn" onClick={() => onUpdateQty(item.id, -1)}>−</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 20, textAlign: "center" }}>{item.qty}</span>
                <button className="qty-btn" onClick={() => onUpdateQty(item.id, 1)}>+</button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, width: 52, textAlign: "right" }}>Rs. {(item.price * item.qty).toLocaleString()}</div>
              <button className="del-btn" onClick={() => onUpdateQty(item.id, -item.qty)}>
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
          onClick={onShowPromo}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          {discount > 0 ? `Promo Applied: −Rs. ${discount.toFixed(2)}` : "Apply Promo Code"}
        </button>

        <button
          className="main-checkout-btn"
          onClick={onCheckout}
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
  );
}