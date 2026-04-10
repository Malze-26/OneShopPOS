"use client";
import { useState, useEffect } from "react";
import { Customer } from "./types";

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface CustomerFormModalProps {
  editingCustomer: Customer | null; // null = add mode, Customer = edit mode
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

  // Pre-fill form when editing
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
  const inputClass = "w-full px-4 py-2.5 text-[13px] bg-[#F7F8FC] border border-[#E3E6F0] rounded-xl outline-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#9290C3] focus:ring-2 focus:ring-[#9290C3]/20 transition-all";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-7 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[17px] font-extrabold text-[#111827]">
            {isEdit ? "Edit Customer" : "Add New Customer"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[13px] text-red-700 font-semibold">✗ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
            <input className={inputClass} name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input className={inputClass} name="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input className={inputClass} name="phone" placeholder="+94 77 123 4567" value={form.phone} onChange={handleChange} />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-transparent border border-[#E3E6F0] rounded-xl text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#1B1A55] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2D2B8F] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {isEdit ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}