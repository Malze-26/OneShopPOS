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

export default function WeightModal({
  product,
  weightInput,
  weightError,
  onWeightChange,
  onClose,
  onAdd,
}: WeightModalProps) {
  const { currency } = useStore();
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

        {/* Weight input */}
        <div className="mb-4">
          <label className="text-[12px] font-bold uppercase tracking-[1px] block mb-2" style={{ color: C.muted }}>Weight (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 0.75 for 750g"
            value={weightInput}
            onChange={(e) => onWeightChange(e.target.value)}
            autoFocus
            className={`w-full text-center text-[18px] font-mono p-3 rounded-lg outline-none box-border`}
            style={{
              border: `1.5px solid ${weightError ? "#FECACA" : C.border}`,
            }}
          />
          {weightError && <p className="text-[12px] mt-1" style={{ color: "#EF4444" }}>{weightError}</p>}
        </div>

        {/* Price preview */}
        {weightInput && parseFloat(weightInput) > 0 && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 text-center">
            <span className="text-[13px] font-semibold text-green-800">
              {weightInput} kg × {currency} {product.sellingPrice.toLocaleString()} ={" "}
              <span className="text-[16px] font-extrabold">{currency} {(parseFloat(weightInput) * product.sellingPrice).toFixed(2)}</span>
            </span>
          </div>
        )}

        {/* Quick weight buttons */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-[1px] mb-2" style={{ color: C.muted }}>Quick Select</div>
          <div className="flex flex-wrap gap-2">
            {["0.25", "0.5", "0.75", "1", "1.5", "2"].map(w => (
              <button
                key={w}
                onClick={() => onWeightChange(w)}
                className={`px-3 py-1 rounded-full text-[13px] font-bold ${weightInput === w ? "text-white" : "text-black"}`}
                style={{
                  background: weightInput === w ? C.brand : "#F0F2F8",
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
          className="w-full h-12 rounded-lg text-white font-bold text-[15px]"
          style={{ background: C.brand }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}