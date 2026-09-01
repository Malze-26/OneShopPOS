"use client";
import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { Customer, getInitials, formatDate } from "./types";

interface OrderRecord {
  _id: string;
  orderId?: string;
  txnId?: string;
  source?: "physical" | "online";
  amount?: number;
  subtotal?: number;
  total?: number;
  paymentMethod: string;
  status: "success" | "pending" | "failed" | "voided" | "delivered" | "confirmed" | "processing" | "cancelled";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  success:    "bg-emerald-100 text-emerald-700",
  delivered:  "bg-emerald-100 text-emerald-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  voided:     "bg-gray-100 text-gray-500",
  cancelled:  "bg-gray-100 text-gray-500",
  pending:    "bg-yellow-100 text-yellow-700",
  failed:     "bg-red-100 text-red-600",
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
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (tab !== "orders") return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const { data } = await api.get(`/customers/${customer._id}/orders`);
        setOrders(data.data ?? []);
      } catch (err) {
        // Fallback to transactions endpoint if orders endpoint fails
        try {
          const { data } = await api.get(
            `/transactions?customerId=${customer._id}&customer=${encodeURIComponent(customer.name)}&limit=100`
          );
          setOrders(data.data ?? []);
        } catch {
          setOrdersError("Failed to load order history.");
        }
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [tab, customer._id]);

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
            <div className="w-14 h-14 rounded-full bg-[#065F46] flex items-center justify-center font-bold text-white text-[20px]">
              {getInitials(customer.name)}
            </div>
            <div className="flex-1">
              <div className="font-bold text-[#111827] text-[17px]">{customer.name}</div>
              <div className="text-[13px] text-[#6B7280] mt-0.5">
                {customer.email || "No email"} · {customer.phone || "No phone"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-[#6B7280]">Total Spent</div>
              <div className="font-bold text-[#065F46] text-[16px]">
                Rs. {customer.totalSpent.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#E3E6F0]">
            {(["info", "orders"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-[13px] font-semibold capitalize transition-colors ${
                  tab === t
                    ? "text-[#065F46] border-b-2 border-[#065F46]"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {t === "info" ? "Info" : "Order History"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="px-6 py-5 max-h-[300px] overflow-y-auto">

            {/* Info Tab */}
            {tab === "info" && (
              <div className="flex flex-col gap-4">
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
                    <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Avg. Spend</div>
                    <div className="text-[15px] font-semibold text-[#111827]">
                      Rs. {customer.totalOrders > 0
                        ? Math.round(customer.totalSpent / customer.totalOrders).toLocaleString()
                        : "0"}
                    </div>
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
            )}

            {/* Orders Tab */}
            {tab === "orders" && (
              <div>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-7 h-7 border-4 border-[#065F46] border-t-transparent rounded-full" />
                  </div>
                ) : ordersError ? (
                  <div className="text-center text-[13px] text-red-600 py-6">{ordersError}</div>
                ) : orders.length === 0 ? (
                  <div className="text-center text-[13px] text-[#6B7280] py-6">No orders found for this customer.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {orders.map((order) => {
                      const idLabel = order.orderId || order.txnId || `#${order._id.slice(-6)}`;
                      const finalAmount = order.total ?? order.amount ?? order.subtotal ?? 0;
                      return (
                        <div key={order._id} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-[#065F46]">{idLabel}</span>
                              {order.source && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  order.source === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {order.source === 'online' ? '🌐 Online' : '🏪 In-Store'}
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-[#6B7280] mt-0.5">
                              {order.paymentMethod || 'Cash'} · {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {order.status}
                            </span>
                            <div className="text-[14px] font-bold text-[#111827]">
                              Rs. {finalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-[#065F46] rounded-xl hover:bg-[#047857] transition-colors"
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