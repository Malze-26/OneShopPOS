"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Customer, CustomerStats } from "./types";
import CustomerStatCards from "./StatCards";
import CustomerList from "./CustomerList";
import CustomerDetailModal from "./CustomerDetailModal";
import CustomerFormModal from "./CustomerFormModal";

export default function CustomersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    totalRevenue: 0,
    avgSpend: 0,
    newThisMonth: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");

  // Detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form modal (add + edit)
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/pos/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [customersRes, statsRes] = await Promise.all([
        api.get("/customers"),
        api.get("/customers/stats"),
      ]);

      // customers returns { data: [...] }
      setCustomers(customersRes.data.data ?? []);

      // FIX: stats returns flat object { totalCustomers, totalRevenue, ... }
      // NOT nested under .data.data
      const s = statsRes.data;
      setStats({
        totalCustomers: s.totalCustomers ?? 0,
        totalRevenue:   s.totalRevenue   ?? 0,
        avgSpend:       s.avgSpend       ?? 0,
        newThisMonth:   s.newThisMonth   ?? 0,
      });

      setFetchError("");
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setFetchError("Failed to load customers. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleFormSubmit = async (form: { name: string; email: string; phone: string }) => {
    setFormLoading(true);
    setFormError("");
    try {
      if (editingCustomer) {
        const { data } = await api.put(`/customers/${editingCustomer._id}`, form);
        setCustomers((prev) => prev.map((c) => c._id === editingCustomer._id ? data.data : c));
        setSelectedCustomer(data.data);
      } else {
        const { data } = await api.post("/customers", form);
        setCustomers((prev) => [data.data, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalCustomers: prev.totalCustomers + 1,
          newThisMonth: prev.newThisMonth + 1,
        }));
      }
      setShowForm(false);
      setEditingCustomer(null);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c._id !== id));
      setStats((prev) => ({
        ...prev,
        totalCustomers: Math.max(0, prev.totalCustomers - 1),
      }));
      setSelectedCustomer(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete customer.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (authLoading || loadingData) return (
    <div className="flex items-center justify-center h-screen bg-[#F0F2F8]">
      <div
        className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "var(--color-primary, #155dfc)", borderTopColor: "transparent" }}
      />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F8] font-sans">
      <div className="max-w-[1100px] mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mb-5">
          <button
            onClick={() => router.push("/pos/dashboard")}
            className="bg-transparent border-none cursor-pointer text-[#6B7280] hover:text-[var(--color-primary)] transition-colors"
          >
            Home
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="font-semibold text-[#111827]">Customers</span>
        </div>

        {/* Title */}
        <div className="mb-7">
          <h1 className="text-[28px] font-extrabold mb-1 text-[#111827] tracking-[-0.5px]">Customers</h1>
          <p className="text-[13px] text-[#6B7280]">Manage your customer base and track spending</p>
        </div>

        {/* Fetch Error */}
        {fetchError && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-[13px] text-red-700 font-medium">{fetchError}</p>
            <button onClick={fetchAll} className="ml-auto text-[12px] font-bold text-red-700 underline">
              Retry
            </button>
          </div>
        )}

        <CustomerStatCards stats={stats} />

        <CustomerList
          customers={customers}
          search={search}
          onSearch={setSearch}
          onSelect={setSelectedCustomer}
          onAdd={() => {
            setEditingCustomer(null);
            setFormError("");
            setShowForm(true);
          }}
        />
      </div>

      {/* Detail Modal */}
      {selectedCustomer && !showForm && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(c) => {
            setEditingCustomer(c);
            setFormError("");
            setShowForm(true);
          }}
          onDelete={handleDelete}
          deleteLoading={deleteLoading}
        />
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <CustomerFormModal
          editingCustomer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
            setFormError("");
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          error={formError}
        />
      )}
    </div>
  );
}