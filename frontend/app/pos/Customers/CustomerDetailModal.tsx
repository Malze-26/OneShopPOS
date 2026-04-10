"use client";
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
  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-7 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[17px] font-extrabold text-[#111827]">Customer Details</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1B1A55] flex items-center justify-center text-white text-[18px] font-bold">
            {getInitials(customer.name)}
          </div>
          <div>
            <p className="text-[16px] font-extrabold text-[#111827]">{customer.name}</p>
            <p className="text-[12px] text-[#6B7280]">Since {formatDate(customer.createdAt)}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-[#F7F8FC] rounded-xl border border-[#E3E6F0] p-4 mb-5 space-y-2.5">
          {[
            { label: "Email",         value: customer.email || "—" },
            { label: "Phone",         value: customer.phone || "—" },
            { label: "Total Orders",  value: String(customer.totalOrders) },
            { label: "Total Spent",   value: `Rs. ${customer.totalSpent.toLocaleString()}` },
            { label: "Last Purchase", value: formatDate(customer.lastPurchase) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[12px] text-[#6B7280]">{label}</span>
              <span className="text-[12px] font-bold text-[#111827]">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => onEdit(customer)}
            className="flex-1 py-2.5 bg-[#1B1A55] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2D2B8F] transition-colors flex items-center justify-center gap-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${customer.name}? This cannot be undone.`)) {
                onDelete(customer._id);
              }
            }}
            disabled={deleteLoading}
            className="flex-1 py-2.5 bg-red-50 border border-red-200 text-red-600 text-[13px] font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleteLoading ? (
              <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            )}
            Delete
          </button>
        </div>

        <button onClick={onClose} className="w-full mt-2.5 py-2.5 bg-transparent border border-[#E3E6F0] rounded-xl text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}