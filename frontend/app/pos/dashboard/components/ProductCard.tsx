import { C, CARD_GRADIENTS } from "../constants/tokens";

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

interface ProductCardProps {
  product: Product;
  index: number;
  inCart: boolean;
  cartQty: number;
  addedId: string | null;
  onAdd: (product: Product) => void;
}

export default function ProductCard({
  product,
  index,
  inCart,
  cartQty,
  addedId,
  onAdd,
}: ProductCardProps) {
  const [g1, g2] = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const stockColor = product.stock === 0 ? C.danger : product.stock <= 10 ? "#F59E0B" : C.success;
  const initial = product.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={() => onAdd(product)}
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

        {/* Initial Avatar */}
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

        {/* Category badge */}
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

        {/* Cart qty badge */}
        {inCart && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: C.brand, color: "#fff",
            width: 22, height: 22, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
            boxShadow: "0 2px 6px rgba(27,26,85,0.3)",
          }}>
            {cartQty}
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
}