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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, digits, and a single decimal point
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      onWeightChange(val);
    }
  };

  const handleBlur = () => {
    // On blur, normalise to 1 decimal place if there's a valid number
    if (currentKg > 0) {
      onWeightChange(currentKg.toFixed(1));
    }
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

        {/* Typed weight input */}
        <div className="mb-4">
          <label className="text-[12px] font-bold uppercase tracking-[1px] block mb-3" style={{ color: C.muted }}>
            Weight (kg)
          </label>
          <div
            className="flex items-center rounded-xl px-4 py-3"
            style={{ border: `1.5px solid ${weightError ? "#FECACA" : C.border}` }}
          >
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={weightInput}
              onChange={handleChange}
              onBlur={handleBlur}
              className="flex-1 text-[28px] font-extrabold font-mono text-center bg-transparent outline-none leading-tight"
              style={{ color: C.text }}
            />
            <span className="text-[16px] font-bold ml-2" style={{ color: C.muted }}>kg</span>
          </div>
          {grams > 0 && !weightError && (
            <p className="text-[12px] mt-2 text-center" style={{ color: C.muted }}>{grams} g</p>
          )}
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