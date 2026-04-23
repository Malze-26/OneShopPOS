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

// Modal component for applying promo codes, showing current discount, and handling promo-related UI in the POS dashboard
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
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[20px] w-full max-w-[380px] p-7 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[17px] font-extrabold text-[color:var(--color-text)]">Apply Promo Code</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Current discount */}
        {discount > 0 && (
          <div className="flex justify-between items-center mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <div>
              <p className="text-[12px] font-bold text-green-800 m-0">✓ Applied: {promoCode}</p>
              <p className="text-[12px] text-green-800 m-0">Saving Rs. {discount.toFixed(2)}</p>
            </div>
            <button
              onClick={onRemove}
              className="text-[11px] font-bold text-red-500 cursor-pointer bg-none border-none"
            >
              Remove
            </button>
          </div>
        )}

        {/* Error */}
        {promoError && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-[13px] text-red-500 m-0">{promoError}</p>
          </div>
        )}

        {/* Success */}
        {promoSuccess && (
          <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-[13px] text-green-800 font-semibold m-0">✓ {promoSuccess}</p>
          </div>
        )}

        {/* Input + Apply */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Enter promo code"
            value={promoInput}
            onChange={(e) => onPromoInputChange(e.target.value.toUpperCase())}
            className={`flex-1 p-3 border-[1.5px] rounded-lg text-[14px] font-sans outline-none text-uppercase tracking-wider ${C.border}`}
          />
          <button
            disabled={promoLoading || !promoInput.trim()}
            onClick={onApply}
            className={`px-4 py-2 rounded-lg font-bold text-[13px] text-white ${
              promoLoading || !promoInput.trim() ? "bg-gray-400 cursor-not-allowed" : "bg-[color:var(--color-primary)] cursor-pointer"
            }`}
          >
            {promoLoading ? "..." : "Apply"}
          </button>
        </div>

        <p className="text-[11px] text-[color:var(--color-secondary)] text-center mt-2">
          Promo codes are case-insensitive
        </p>
      </div>
    </div>
  );
}