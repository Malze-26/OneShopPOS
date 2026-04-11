"use client";
import { useState } from "react";

interface CheckoutModalProps {
  isOpen: boolean;
  cart: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerName?: string;
  onComplete: (paymentData: any) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function CheckoutModal({
  isOpen,
  cart,
  subtotal,
  tax,
  discount,
  total,
  customerName = "Walk-in Customer",
  onComplete,
  onClose,
  loading = false,
}: CheckoutModalProps) {
  const [amountReceived, setAmountReceived] = useState<number>(total);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [error, setError] = useState("");

  const changeToReturn = amountReceived - total;

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total) + 100,
    Math.ceil(total) + 500,
    Math.ceil(total) + 1000,
  ];

  const handleAmountSelect = (amount: number) => {
    setAmountReceived(amount);
  };

  const handleComplete = async () => {
    if (amountReceived < total) {
      setError("Amount received must be at least equal to total");
      return;
    }

    try {
      setError("");
      await onComplete({
        paymentMethod,
        amountReceived,
        changeToReturn,
      });
    } catch (err: any) {
      setError(err.message || "Payment failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e2a9e" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">Complete Transaction</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="space-y-2 mb-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} x{item.qty}</span>
                  <span className="font-medium text-[#1a1a2e]">Rs. {(item.price * item.qty).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm border-t border-gray-200 pt-2">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>Rs. {Math.round(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (5%)</span>
                <span>Rs. {Math.round(tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[#1a1a2e] pt-1">
                <span>Total</span>
                <span className="text-lg text-[#1e2a9e]">Rs. {Math.round(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Method</h3>
            <div className="flex gap-2">
              {(["cash", "card"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === method
                      ? "border-[#1e2a9e] bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {method === "cash" ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <path d="M12 8v8" />
                      <path d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <path d="M1 10h22" />
                    </svg>
                  )}
                  <span className="text-xs font-medium capitalize">{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Received */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Amount Received</h3>
            <input
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(Number(e.target.value))}
              className="w-full text-center text-2xl font-bold border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1e2a9e] transition"
              placeholder="0"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount, idx) => (
              <button
                key={idx}
                onClick={() => handleAmountSelect(amount)}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  amountReceived === amount
                    ? "bg-[#1e2a9e] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Rs.
                <br />
                {amount}
              </button>
            ))}
          </div>

          {/* Change to Return */}
          {changeToReturn > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 font-medium mb-1">Change to Return</p>
              <p className="text-3xl font-bold text-green-600">Rs. {Math.round(changeToReturn)}</p>
            </div>
          )}

          {/* Customer Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer Info</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">{customerName}</p>
                <p className="text-xs text-gray-400">Walk-in Customer</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Order
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1e2a9e] hover:bg-[#1a2490] disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all active:scale-[0.98]"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {loading ? "PROCESSING..." : "COMPLETE PAYMENT"}
          </button>
        </div>
      </div>
    </div>
  );
}
