'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, ChevronLeft, ChevronRight, Building2, CheckCircle, XCircle, Tag } from 'lucide-react';
import api from '@/app/lib/api';

interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  status: 'active' | 'inactive';
  notes: string;
  createdAt: string;
}

interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  categoriesSupplied: number;
}

const ITEMS_PER_PAGE = 10;

const emptyForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  categories: '',
  notes: '',
  status: 'active' as 'active' | 'inactive',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SupplierStats>({ total: 0, active: 0, inactive: 0, categoriesSupplied: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [slideOver, setSlideOver] = useState<Supplier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchStats = useCallback(() => {
    api.get('/suppliers/stats').then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { status: statusFilter };
    if (search.trim()) params.search = search.trim();
    api
      .get('/suppliers', { params })
      .then((r) => setSuppliers(r.data.data))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchSuppliers(); setPage(1); }, [fetchSuppliers]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      categories: s.categories.join(', '),
      notes: s.notes,
      status: s.status,
    });
    setFormError('');
    setShowModal(true);
    setSlideOver(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Supplier name is required'); return; }
    setSaving(true);
    setFormError('');
    const payload = {
      ...form,
      name: form.name.trim(),
      categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
    };
    try {
      if (editTarget) {
        await api.patch(`/suppliers/${editTarget._id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }
      setShowModal(false);
      fetchSuppliers();
      fetchStats();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/suppliers/${id}`);
      setShowDeleteConfirm(null);
      setSlideOver(null);
      fetchSuppliers();
      fetchStats();
    } catch {
      // silently ignore — could show a toast here
    }
  };

  const totalPages = Math.max(1, Math.ceil(suppliers.length / ITEMS_PER_PAGE));
  const paged = suppliers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>

          <p className="text-sm text-[#4a5565] mt-1">Manage your product suppliers and contacts</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Building2 className="w-5 h-5 text-[var(--color-primary)]" />} label="Total Suppliers" value={stats.total} bg="var(--color-primary-light)" />
        <StatCard icon={<CheckCircle className="w-5 h-5 text-[#12b76a]" />} label="Active" value={stats.active} bg="#ecfdf3" />
        <StatCard icon={<XCircle className="w-5 h-5 text-[#f04438]" />} label="Inactive" value={stats.inactive} bg="#fef3f2" />
        <StatCard icon={<Tag className="w-5 h-5 text-[#f79009]" />} label="Categories Supplied" value={stats.categoriesSupplied} bg="#fffaeb" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
          <input
            type="text"
            placeholder="Search by name, contact, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#9aa3ae] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Supplier', 'Contact Person', 'Email', 'Phone', 'Categories', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#4a5565]">Loading suppliers…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#4a5565]">No suppliers found</td></tr>
              ) : paged.map((s) => (
                <tr key={s._id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSlideOver(s)}
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline text-left"
                    >
                      {s.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#101828]">{s.contactPerson || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#4a5565]">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#4a5565] whitespace-nowrap">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.categories.length === 0
                        ? <span className="text-sm text-[#4a5565]">—</span>
                        : s.categories.slice(0, 2).map((c) => (
                          <span key={c} className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs rounded-full">{c}</span>
                        ))}
                      {s.categories.length > 2 && (
                        <span className="px-2 py-0.5 bg-[#f9fafb] text-[#4a5565] text-xs rounded-full">+{s.categories.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'active' ? 'bg-[#ecfdf3] text-[#12b76a]' : 'bg-[#fef3f2] text-[#f04438]'
                    }`}>
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(s._id)}
                        className="text-xs text-[#f04438] hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">
            {suppliers.length === 0
              ? 'No records'
              : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, suppliers.length)} of ${suppliers.length}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#101828]">{editTarget ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#4a5565] hover:text-[#101828]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && <p className="text-sm text-[#f04438] mb-4">{formError}</p>}

            <div className="space-y-4">
              <Field label="Supplier Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Ceylon Beverages Ltd" />
              <Field label="Contact Person" value={form.contactPerson} onChange={(v) => setForm((f) => ({ ...f, contactPerson: v }))} placeholder="e.g. Nimal Perera" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="contact@supplier.lk" type="email" />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+94 11 234 5678" />
              </div>
              <Field label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="Street, City" />
              <Field
                label="Categories (comma-separated)"
                value={form.categories}
                onChange={(v) => setForm((f) => ({ ...f, categories: v }))}
                placeholder="e.g. Beverages, Dairy & Eggs"
              />
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Optional notes about this supplier..."
                  className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#9aa3ae] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#101828] mb-2">Delete Supplier</h3>
            <p className="text-sm text-[#4a5565] mb-6">
              Are you sure you want to delete this supplier? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-[#f04438] hover:bg-[#d03030] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Detail Panel */}
      {slideOver && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSlideOver(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e7ec]">
              <h2 className="text-lg font-semibold text-[#101828]">{slideOver.name}</h2>
              <button onClick={() => setSlideOver(null)} className="text-[#4a5565] hover:text-[#101828]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 flex-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 ${
                slideOver.status === 'active' ? 'bg-[#ecfdf3] text-[#12b76a]' : 'bg-[#fef3f2] text-[#f04438]'
              }`}>
                {slideOver.status === 'active' ? 'Active' : 'Inactive'}
              </span>

              <Section label="Contact Person" value={slideOver.contactPerson} />
              <Section label="Email" value={slideOver.email} />
              <Section label="Phone" value={slideOver.phone} />
              <Section label="Address" value={slideOver.address} />

              {slideOver.categories.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[#4a5565] mb-1.5">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {slideOver.categories.map((c) => (
                      <span key={c} className="px-2.5 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {slideOver.notes && (
                <div className="mb-4">
                  <p className="text-xs text-[#4a5565] mb-1.5">Notes</p>
                  <p className="text-sm text-[#101828] bg-[#f9fafb] rounded-lg p-3 leading-relaxed">{slideOver.notes}</p>
                </div>
              )}

              <p className="text-xs text-[#9aa3ae] mt-6">
                Added {new Date(slideOver.createdAt).toLocaleDateString('en-CA')}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e7ec] flex gap-3">
              <button
                onClick={() => openEdit(slideOver)}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(slideOver._id)}
                className="px-4 py-2 text-[#f04438] hover:bg-[#fef3f2] border border-[#e4e7ec] rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#4a5565]">{label}</p>
        <p className="text-2xl font-bold text-[#101828]">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#101828] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#9aa3ae] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
      />
    </div>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mb-4">
      <p className="text-xs text-[#4a5565] mb-0.5">{label}</p>
      <p className="text-sm text-[#101828]">{value}</p>
    </div>
  );
}
