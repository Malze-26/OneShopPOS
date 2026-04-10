"use client";
import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { Customer, getInitials, formatDate } from "./types";

interface Transaction {
  _id: string;
  txnId: string;
  amount: number;
  paymentMethod: string;
  status: "success" | "pending" | "failed" | "refunded" | "voided";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  success:  "bg-emerald-100 text-emerald-700",
  refunded: "bg-amber-100 text-amber-700",
  voided:   "bg-gray-100 text-gray-500",
  pending:  "bg-yellow-100 text-yellow-700",
  failed:   "bg-red-100 text-red-600",
};

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
  const [tab, setTab] = useState<"info" | "orders">("info");
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (tab !== "orders") return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        // ✅ Query by customerId (reliable) — no more fragile name matching
        const { data } = await api.get(`/transactions?customerId=${customer._id}`);
        setOrders(data.data ?? []);
      } catch (err) {
        setOrdersError("Failed to load order history.");
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [tab, customer._id]);

  const tabClass = (t: "info" | "orders") =>
    `px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
      tab === t
        ? "bg-[#1B1A55] text-white"
        : "text-[#6B7280] hover:text-[#1B1A55] hover:bg-[#F0F2F8]"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md font-sans overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-7 pt-7 pb-4">
          <h3 className="text-[17px] font-extrabold text-[#111827]">Customer Details</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 px-7 pb-4">
          <div className="w-14 h-14 rounded-full bg-[#1B1A55] flex items-center justify-center text-white text-[18px] font-bold flex-shrink-0">
            {getInitials(customer.name)}
          </div>
          <div>
            <p className="text-[16px] font-extrabold text-[#111827]">{customer.name}</p>
            <p className="text-[12px] text-[#6B7280]">Customer since {formatDate(customer.createdAt)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-7 pb-4">
          <button className={tabClass("info")} onClick={() => setTab("info")}>Info</button>
          <button className={tabClass("orders")} onClick={() => setTab("orders")}>
            Order History
            {customer.totalOrders > 0 && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${tab === "orders" ? "bg-white/20" : "bg-[#1B1A55]/10 text-[#1B1A55]"}`}>
                {customer.totalOrders}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="px-7 pb-5 max-h-[280px] overflow-y-auto">

          {/* Info Tab */}
          {tab === "info" && (
            <div className="bg-[#F7F8FC] rounded-xl border border-[#E3E6F0] p-4 space-y-2.5">
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
          )}

          {/* Orders Tab */}
          {tab === "orders" && (
            <div>
              {ordersLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#1B1A55] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {ordersError && (
                <p className="text-[13px] text-red-600 text-center py-4">{ordersError}</p>
              )}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[13px] text-[#6B7280]">No orders found for this customer.</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">Orders appear here when customer is selected at checkout.</p>
                </div>
              )}
              {!ordersLoading && orders.map((o, i) => (
                <div
                  key={o._id}
                  className={`flex items-center justify-between py-3 ${
                    i < orders.length - 1 ? "border-b border-[#E3E6F0]" : ""
                  }`}
                >
                  <div>
                    <p className="text-[13px] font-bold text-[#535C91]">#{o.txnId}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      {new Date(o.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}{o.paymentMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                    <span className="text-[13px] font-bold text-[#111827]">Rs. {o.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-7 pb-4">
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
              if (confirm(`Delete ${customer.name}? This cannot be undone.`)) onDelete(customer._id);
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

        <div className="px-7 pb-7">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-transparent border border-[#E3E6F0] rounded-xl text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}