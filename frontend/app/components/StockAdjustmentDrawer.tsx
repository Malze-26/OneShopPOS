import { X, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface StockAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id: number;
    name: string;
    sku: string;
    currentStock: number;
  };
}

export function StockAdjustmentDrawer({ isOpen, onClose, product }: StockAdjustmentDrawerProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = () => {
    // Handle stock adjustment
    console.log({
      productId: product.id,
      type: adjustmentType,
      quantity,
      reason,
      notes,
    });
    onClose();
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#101828]">Adjust Stock</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4a5565] hover:text-[#101828] hover:bg-[#f9fafb] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Product Info */}
          <div className="p-4 bg-[#f9fafb] rounded-lg">
            <div className="text-base font-semibold text-[#101828] mb-1">
              {product.name}
            </div>
            <div className="text-xs text-[#4a5565] mb-3">
              SKU: {product.sku}
            </div>
            <div className="text-sm text-[#4a5565]">
              Current Stock: <span className="font-semibold text-[#101828]">{product.currentStock} units</span>
            </div>
          </div>

          {/* Adjustment Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-3">
              Adjustment Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setAdjustmentType('add')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  adjustmentType === 'add'
                    ? 'bg-[#155dfc] border-[#155dfc] text-white'
                    : 'bg-white border-[#e4e7ec] text-[#4a5565] hover:border-[#155dfc]'
                }`}
              >
                <Plus className="w-4 h-4 inline-block mr-2" />
                Add Stock
              </button>
              <button
                onClick={() => setAdjustmentType('remove')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  adjustmentType === 'remove'
                    ? 'bg-[#f04438] border-[#f04438] text-white'
                    : 'bg-white border-[#e4e7ec] text-[#4a5565] hover:border-[#f04438]'
                }`}
              >
                <Minus className="w-4 h-4 inline-block mr-2" />
                Remove Stock
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-3">
              Quantity
            </label>
            <div className="flex items-center justify-center gap-4 p-4 bg-[#f9fafb] rounded-lg">
              <button
                onClick={decrementQuantity}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-[#e4e7ec] hover:border-[#155dfc] rounded-lg transition-colors"
              >
                <Minus className="w-5 h-5 text-[#4a5565]" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-12 text-center text-2xl font-bold text-[#101828] bg-white border-2 border-[#e4e7ec] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
              />
              <button
                onClick={incrementQuantity}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-[#e4e7ec] hover:border-[#155dfc] rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-[#4a5565]" />
              </button>
            </div>
            <div className="mt-2 text-center text-xs text-[#4a5565]">
              {adjustmentType === 'add' ? 'Adding' : 'Removing'} {quantity} unit{quantity !== 1 ? 's' : ''} •{' '}
              New total:{' '}
              <span className="font-semibold text-[#101828]">
                {adjustmentType === 'add'
                  ? product.currentStock + quantity
                  : Math.max(0, product.currentStock - quantity)}{' '}
                units
              </span>
            </div>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
            >
              <option value="">Select a reason...</option>
              {adjustmentType === 'add' ? (
                <>
                  <option value="received">Received from Supplier</option>
                  <option value="return">Customer Return</option>
                  <option value="correction">Stock Correction</option>
                  <option value="other">Other</option>
                </>
              ) : (
                <>
                  <option value="damaged">Damaged Goods</option>
                  <option value="expired">Expired Products</option>
                  <option value="correction">Stock Correction</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="other">Other</option>
                </>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add a note about this adjustment..."
              className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason}
            className="flex-1 px-4 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Adjustment
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
