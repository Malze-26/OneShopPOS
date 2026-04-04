import { C } from "../constants/tokens";

interface PromoModalProps {
  subtotal: number;
  discount: number;
  promoCode: string;
  promoInput: string;
  promoLoading: boolean;
  promoError: string;
  promoSuccess: string;
  onPromoInputChange: (val: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function PromoModal({
  subtotal,
  discount,
  promoCode,
  promoInput,
  promoLoading,
  promoError,
  promoSuccess,
  onPromoInputChange,
  onApply,
  onRemove,
  onClose,
}: PromoModalProps) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380, padding: 28, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Apply Promo Code</h3>
          <button
            onClick={onClose}
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
              onClick={onRemove}
              style={{ fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              Remove
            </button>
          </div>
        )}

        {/* Error */}
        {promoError && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>{promoError}</p>
          </div>
        )}

        {/* Success */}
        {promoSuccess && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: "#065F46", margin: 0, fontWeight: 600 }}>✓ {promoSuccess}</p>
          </div>
        )}

        {/* Input + Apply */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Enter promo code"
            value={promoInput}
            onChange={(e) => onPromoInputChange(e.target.value.toUpperCase())}
            style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "1px" }}
          />
          <button
            disabled={promoLoading || !promoInput.trim()}
            onClick={onApply}
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
  );
}