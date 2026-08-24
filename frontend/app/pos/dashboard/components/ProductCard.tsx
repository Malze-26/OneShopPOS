"use client";

import { C, CARD_GRADIENTS } from "../constants/tokens";
import { Product } from "@/app/hooks/useProductsData";

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
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 border ${inCart ? "shadow-[0_4px_16px_rgba(27,26,85,0.15)]" : ""
        } ${addedId === product._id ? "animate-pulse" : ""}`}
      style={{
        opacity: product.stock === 0 ? 0.6 : 1,
        borderColor: inCart ? C.brand : C.border,
      }}
    >
      {/* Card Image Area */}
      <div
        className="relative flex items-center justify-center aspect-[4/3]"
        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
      >
        {/* Initial Avatar */}
        <div
          className="w-12 h-12 rounded-lg bg-white/50 backdrop-blur-sm flex items-center justify-center text-[24px] font-black shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          style={{ color: C.brand }}
        >
          {initial}
        </div>

        {/* Category Badge */}
        <div
          className="absolute top-2 left-2 px-2 py-[2px] rounded-full text-[9px] font-bold uppercase tracking-[0.5px] bg-white/75 backdrop-blur-[4px]"
          style={{ color: C.text }}
        >
          {product.category}
        </div>

        {/* Cart Quantity Badge */}
        {inCart && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full text-white flex items-center justify-center text-[11px] font-extrabold shadow-[0_2px_6px_rgba(27,26,85,0.3)]"
            style={{ background: C.brand }}
          >
            {cartQty}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
            <span
              className="text-[10px] font-extrabold text-white px-3 py-[3px] rounded-full tracking-[0.5px]"
              style={{ background: C.danger }}
            >
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
        <div
          className="text-[12px] font-bold mb-1 truncate"
          style={{ color: C.text }}
        >
          {product.name}
        </div>
        <div className="flex justify-between items-center mb-2">
          <div
            className="font-extrabold text-[15px] font-mono"
            style={{ color: C.brand }}
          >
            Rs. {product.sellingPrice.toLocaleString()}
            {product.isWeightBased && (
              <span className="text-[11px] font-normal" style={{ color: C.muted }}> / kg</span>
            )}
          </div>
          {product.isWeightBased && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#EEF2FF", color: C.text }}
            >
              BY WEIGHT
            </span>
          )}
        </div>

        {/* Stock Bar */}
        <div>
          <div className="flex justify-between items-center mb-[3px]">
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.5px]"
              style={{ color: C.text }}
            >
              Stock
            </span>
            <span className="text-[9px] font-bold" style={{ color: stockColor }}>
              {product.stock}{product.isWeightBased ? " kg" : ""}
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