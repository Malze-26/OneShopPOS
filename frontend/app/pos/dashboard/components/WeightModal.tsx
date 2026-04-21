import { C } from "../constants/tokens";
import { useStore } from "@/app/contexts/StoreContext";

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

const STEP = 0.1; // 100g
const MIN = 0.1;

export default function WeightModal({
  product,
  weightInput,
  weightError,
  onWeightChange,
  onClose,
  onAdd,
}: WeightModalProps) {
  const { currency } = useStore();

  const currentKg = parseFloat(weightInput) || 0;
  const grams = Math.round(currentKg * 1000);

  const increment = () => {
    const next = Math.round((currentKg + STEP) * 10) / 10;
    onWeightChange(next.toFixed(1));
  };

  const decrement = () => {
    const next = Math.round((currentKg - STEP) * 10) / 10;
    if (next >= MIN) onWeightChange(next.toFixed(1));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[360px] p-7 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[17px] font-extrabold" style={{ color: C.text }}>Enter Weight</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Product info */}
        <div className="bg-gray-100 rounded-xl p-4 mb-5">
          <div className="text-[14px] font-bold mb-1" style={{ color: C.text }}>{product.name}</div>
          <div className="text-[13px]" style={{ color: C.muted }}>
            Price: <span className="font-bold" style={{ color: C.brand }}>{currency} {product.sellingPrice.toLocaleString()} / kg</span>
          </div>
        </div>

        {/* Numeric stepper */}
        <div className="mb-4">
          <label className="text-[12px] font-bold uppercase tracking-[1px] block mb-3" style={{ color: C.muted }}>
            Weight (100g steps)
          </label>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={decrement}
              disabled={currentKg <= MIN}
              className="w-14 h-14 rounded-xl text-[22px] font-bold flex items-center justify-center transition-all"
              style={{
                background: currentKg <= MIN ? "#F3F4F6" : "#F0F2F8",
                color: currentKg <= MIN ? "#D1D5DB" : C.text,
                border: `1.5px solid ${currentKg <= MIN ? "#E5E7EB" : C.border}`,
              }}
            >
              −
            </button>

            <div className="flex-1 text-center py-3 rounded-xl" style={{ border: `1.5px solid ${weightError ? "#FECACA" : C.border}` }}>
              <div className="text-[28px] font-extrabold font-mono leading-tight" style={{ color: C.text }}>
                {grams > 0 ? `${grams} g` : "—"}
              </div>
              {currentKg > 0 && (
                <div className="text-[12px]" style={{ color: C.muted }}>{currentKg.toFixed(1)} kg</div>
              )}
            </div>

            <button
              onClick={increment}
              className="w-14 h-14 rounded-xl text-[22px] font-bold flex items-center justify-center transition-all"
              style={{ background: "#F0F2F8", color: C.text, border: `1.5px solid ${C.border}` }}
            >
              +
            </button>
          </div>
          {weightError && <p className="text-[12px] mt-2" style={{ color: "#EF4444" }}>{weightError}</p>}
        </div>

        {/* Price preview */}
        {currentKg > 0 && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 text-center">
            <span className="text-[13px] font-semibold text-green-800">
              {grams} g × {currency} {product.sellingPrice.toLocaleString()} ={" "}
              <span className="text-[16px] font-extrabold">{currency} {(currentKg * product.sellingPrice).toFixed(2)}</span>
            </span>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={currentKg < MIN}
          className="w-full h-12 rounded-lg text-white font-bold text-[15px] transition-opacity"
          style={{ background: C.brand, opacity: currentKg < MIN ? 0.5 : 1 }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
