'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, Loader2, Tag, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/app/lib/api';

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  /** Three capital letters every SKU in this category starts with, e.g. SDW. */
  skuPrefix?: string;
  productCount: number;
}

const colorOptions = [
  'var(--color-primary)', '#7f56d9', '#f79009', '#12b76a',
  '#ee46bc', '#3b82f6', '#f59e0b', '#6366f1',
];

const emptyForm = { name: '', icon: '', color: colorOptions[0] };

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data ?? []);
    } catch {
      setError('Failed to load categories. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Categories are loaded in full, so filter locally — no extra request per keystroke.
  const query = search.trim().toLowerCase();
  const visibleCategories = useMemo(
    () => (query ? categories.filter((c) => c.name.toLowerCase().includes(query)) : categories),
    [categories, query]
  );

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        const res = await api.put(`/categories/${editTarget._id}`, {
          name: form.name.trim(),
          icon: form.icon || '📦',
          color: form.color,
        });
        setCategories((prev) =>
          prev.map((c) => (c._id === editTarget._id ? { ...c, ...res.data.data } : c))
        );
      } else {
        const res = await api.post('/categories', {
          name: form.name.trim(),
          icon: form.icon || '📦',
          color: form.color,
        });
        setCategories((prev) => [...prev, { ...res.data.data, productCount: 0 }]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const warning = cat.productCount > 0
      ? `Delete "${cat.name}"?\n\nThis will ALSO PERMANENTLY DELETE the ${cat.productCount} product${cat.productCount === 1 ? '' : 's'} in this category, along with their stock history.\n\nThis cannot be undone.`
      : `Delete "${cat.name}"?\n\nThis category has no products.`;
    if (!confirm(warning)) return;
    try {
      const res = await api.delete(`/categories/${cat._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      const removed = res.data?.deletedProducts ?? 0;
      if (removed > 0) {
        alert(`Deleted "${cat.name}" and ${removed} product${removed === 1 ? '' : 's'}.`);
      }
    } catch {
      alert('Failed to delete category');
    }
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
         
          <p className="text-sm text-[#4a5565]">Manage product categories</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Stat tile */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-4 bg-white rounded-xl px-6 py-4 shadow-sm border border-[#e4e7ec] min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-xs text-[#4a5565] font-medium uppercase tracking-wide">Total Categories</p>
            {loading ? (
              <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin mt-1" />
            ) : (
              <p className="text-2xl font-bold text-[#101828]">{categories.length}</p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            aria-label="Search categories by name"
            className="w-full pl-9 pr-9 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#9aa3ae] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear category search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#4a5565] hover:text-[#101828] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {query && !loading && !error && (
          <p className="mt-2 text-sm text-[#4a5565]">
            {visibleCategories.length} of {categories.length} categories
          </p>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          <span className="ml-3 text-[#4a5565]">Loading categories…</span>
        </div>
      ) : error ? (
        <div className="text-center p-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchCategories}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[#0d4dd9] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : visibleCategories.length === 0 && query ? (
        <div className="text-center p-16 bg-white rounded-xl border border-dashed border-[#e4e7ec]">
          <Tag className="w-8 h-8 text-[#9aa3ae] mx-auto mb-3" />
          <p className="text-sm text-[#4a5565]">No categories match &ldquo;{search.trim()}&rdquo;</p>
          <button
            onClick={() => setSearch('')}
            className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCategories.map((category) => (
            <div
              key={category._id}
              onClick={() => router.push(`/products?category=${encodeURIComponent(category.name)}`)}
              className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec] hover:shadow-md hover:border-[var(--color-primary)] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#101828]">{category.name}</h3>
                      {category.skuPrefix && (
                        <span
                          title={`SKUs in this category read ${category.skuPrefix}-001, ${category.skuPrefix}-002, …`}
                          className="px-1.5 py-0.5 rounded bg-[#f9fafb] border border-[#e4e7ec] text-[10px] font-mono tracking-wider text-[#4a5565]"
                        >
                          {category.skuPrefix}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#4a5565]">{category.productCount} products</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(category); }}
                    className="p-1.5 text-[#4a5565] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(category); }}
                    className="p-1.5 text-[#4a5565] hover:text-[#f04438] hover:bg-[#fef3f2] rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Progress bar – scaled to 200 products max */}
              <div className="h-2 bg-[#f9fafb] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((category.productCount / 200) * 100, 100)}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Add New Category Card — hidden while filtering so results stay clean */}
          {!query && (
            <button
              onClick={openAdd}
              className="bg-white rounded-xl p-5 shadow-sm border-2 border-dashed border-[#e4e7ec] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all flex flex-col items-center justify-center min-h-[140px] group"
            >
              <Plus className="w-8 h-8 text-[#4a5565] group-hover:text-[var(--color-primary)] mb-2" />
              <span className="text-sm font-medium text-[#4a5565] group-hover:text-[var(--color-primary)]">
                Add New Category
              </span>
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#101828]">
                {editTarget ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#4a5565] hover:text-[#101828] text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg text-sm text-[#f04438]">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">Category Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Beverages"
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">Icon Emoji</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="e.g., 🥤"
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        form.color === color
                          ? 'border-[#101828] scale-110'
                          : 'border-[#e4e7ec] hover:border-[#101828]'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e4e7ec] flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editTarget ? 'Save Changes' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
