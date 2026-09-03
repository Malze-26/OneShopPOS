"use client";
import { useState, useEffect } from "react";
import { Customer } from "./types";

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface CustomerFormModalProps {
  editingCustomer: Customer | null;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  loading: boolean;
  error: string;
}

export default function CustomerFormModal({
  editingCustomer,
  onClose,
  onSubmit,
  loading,
  error,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<FormData>({ name: "", email: "", phone: "" });

  useEffect(() => {
    if (editingCustomer) {
      setForm({
        name: editingCustomer.name,
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
      });
    } else {
      setForm({ name: "", email: "", phone: "" });
    }
  }, [editingCustomer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const isEdit = !!editingCustomer;
  const inputClass =
    "w-full px-4 py-2.5 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";

  const formatErrorMessage = (msg: string) => {
    if (!msg) return "";
    if (msg.includes("E11000") || msg.toLowerCase().includes("duplicate key")) {
      if (msg.includes("phone")) return "A customer with this phone number already exists.";
      if (msg.includes("email")) return "A customer with this email address already exists.";
      return "A customer with this phone number or email already exists.";
    }
    return msg;
  };

  const displayError = formatErrorMessage(error);

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-7 font-sans">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#111827]">
              {isEdit ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              {isEdit ? "Update customer details below." : "Fill in the details to add a new customer."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error */}
        {displayError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-[12px] text-red-700 font-medium">{displayError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className={labelClass}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Kamal Perera"
              required
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address</label>
            <input
              className={inputClass}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. kamal@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 0771234567"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] border border-[#E3E6F0] rounded-xl hover:bg-[#F3F4F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim() || !form.phone.trim()}
              className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl hover:brightness-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEdit ? "Saving..." : "Adding..."}
                </>
              ) : (
                isEdit ? "Save Changes" : "Add Customer"
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}