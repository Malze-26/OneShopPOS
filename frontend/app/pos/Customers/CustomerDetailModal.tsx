"use client";
import { useState } from "react";
import { Customer, getInitials, formatDate } from "./types";

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (id: string) => void;
  deleteLoading: boolean;
}

export default function CustomerDetailModal({
  customer,
  onClose,
  onEdit,
  onDelete,
  deleteLoading,
}: CustomerDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E6F0]">
            <h2 className="text-[16px] font-bold text-[#111827]">Customer Details</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Customer Summary */}
          <div className="flex items-center gap-4 px-6 py-5 bg-[#F7F8FC] border-b border-[#E3E6F0]">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-[20px]"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {getInitials(customer.name)}
            </div>
            <div className="flex-1">
              <div className="font-bold text-[#111827] text-[17px]">{customer.name}</div>
              <div className="text-[13px] text-[#6B7280] mt-0.5">
                {customer.email || "No email"} · {customer.phone || "No phone"}
              </div>
            </div>
          </div>

          {/* Customer Details Content */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Total Orders</div>
                <div className="text-[15px] font-semibold text-[#111827]">{customer.totalOrders}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Loyalty Points</div>
                <div className="text-[15px] font-semibold text-[#111827]">{customer.loyaltyPoints}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Last Purchase</div>
                <div className="text-[15px] font-semibold text-[#111827]">
                  {formatDate(customer.lastPurchase)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Member Since</div>
                <div className="text-[15px] font-semibold text-[#111827]">
                  {formatDate(customer.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E3E6F0] bg-[#FAFAFA]">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3 w-full">
                <span className="text-[13px] text-red-600 font-medium flex-1">Are you sure?</span>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] border border-[#E3E6F0] rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onDelete(customer._id)}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleteLoading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                  Delete
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-[13px] font-semibold text-[#6B7280] border border-[#E3E6F0] rounded-xl hover:bg-[#F3F4F6] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onEdit(customer)}
                    className="px-4 py-2 text-[13px] font-semibold text-white rounded-xl hover:brightness-95 transition-all shadow-sm cursor-pointer"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    Edit Customer
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}