import { C } from "../constants/tokens";

interface WeightModalProps {
  product: {
    _id: string;
    name: string;
    sellingPrice: number;
    stock: number;
  };
  weightInput: string;
  weightError: string;
  onWeightChange: (val: string) => void;
  onClose: () => void;
  onAdd: () => void;
}

export default function WeightModal({
  product,
  weightInput,
  weightError,
  onWeightChange,
  onClose,
  onAdd,
}: WeightModalProps) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360, padding: 28, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Enter Weight</h3>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Product info */}
        <div style={{ background: "#F0F2F8", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{product.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>Price: <span style={{ fontWeight: 700, color: C.brand }}>Rs. {product.sellingPrice.toLocaleString()} / kg</span></div>
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
            onChange={(e) => onWeightChange(e.target.value)}
            autoFocus
            style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${weightError ? "#FECACA" : C.border}`, borderRadius: 10, fontSize: 18, fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box", textAlign: "center" }}
          />
          {weightError && <p style={{ fontSize: 12, color: "#EF4444", margin: "6px 0 0" }}>{weightError}</p>}
        </div>

        {/* Price preview */}
        {weightInput && parseFloat(weightInput) > 0 && (
          <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>
              {weightInput} kg × Rs. {product.sellingPrice.toLocaleString()} = {" "}
              <span style={{ fontSize: 16, fontWeight: 900 }}>
                Rs. {(parseFloat(weightInput) * product.sellingPrice).toFixed(2)}
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
                onClick={() => onWeightChange(w)}
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
          onClick={onAdd}
          style={{ width: "100%", height: 48, background: C.brand, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}