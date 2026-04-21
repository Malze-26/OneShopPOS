"use client";

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
      onClick={() => product.stock > 0 && onAdd(product)}
      className={`relative rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-all duration-150 border ${
        inCart ? "border-[var(--color-primary)] shadow-[0_4px_16px_rgba(27,26,85,0.15)]" : "border-[var(--color-border)]"
      } ${addedId === product._id ? "animate-pulse" : ""}`}
      style={{ opacity: product.stock === 0 ? 0.6 : 1 }}
    >
      {/* Card Image Area */}
      <div
        className="relative flex items-center justify-center aspect-[4/3]"
        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
      >
        {/* Initial Avatar */}
        <div className="w-13 h-13 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm flex items-center justify-center text-[24px] font-black text-[var(--color-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {initial}
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2 px-2 py-[2px] rounded-full text-[9px] font-bold text-[var(--color-secondary)] uppercase tracking-[0.5px] bg-[rgba(255,255,255,0.75)] backdrop-blur-[4px]">
          {product.category}
        </div>

        {/* Cart Quantity Badge */}
        {inCart && (
          <div className="absolute top-2 right-2 w-5.5 h-5.5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[11px] font-extrabold shadow-[0_2px_6px_rgba(27,26,85,0.3)]">
            {cartQty}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)] flex items-center justify-center">
            <span className="text-[10px] font-extrabold bg-[var(--color-danger)] text-white px-3 py-[3px] rounded-full tracking-[0.5px]">
              OUT OF STOCK
            </span>
          </div>
        )}

        {/* Low Stock Warning */}
        {isLowStock && (
          <div className="absolute bottom-2 left-2 px-2 py-[2px] rounded-full text-[9px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A]">
            ⚠ LOW STOCK
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="px-3 pt-2 pb-3">
        <div className="text-[12px] font-bold text-[var(--color-dark)] mb-1 truncate">
          {product.name}
        </div>
        <div className="flex justify-between items-center mb-2">
          <div className="font-extrabold text-[15px] text-[var(--color-primary)] font-mono">
            Rs. {product.sellingPrice.toLocaleString()}
            {product.isWeightBased && <span className="text-[11px] font-normal text-[var(--color-secondary)]"> / kg</span>}
          </div>
          {product.isWeightBased && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#eff4ff] text-[#155dfc] rounded-full">BY WEIGHT</span>
          )}
        </div>

        {/* Stock Bar */}
        <div>
          <div className="flex justify-between items-center mb-[3px]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[var(--color-secondary)]">
              Stock
            </span>
            <span className="text-[9px] font-bold" style={{ color: stockColor }}>
              {product.stock}
            </span>
          </div>
          <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (product.stock / 120) * 100)}%`,
                background: stockColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}