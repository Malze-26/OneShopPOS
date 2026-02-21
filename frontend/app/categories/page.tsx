'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  productCount: number;
}

const colorOptions = [
  '#155dfc', '#7f56d9', '#f79009', '#12b76a',
  '#ee46bc', '#3b82f6', '#f59e0b', '#6366f1',
];

const emptyForm = { name: '', icon: '', color: colorOptions[0] };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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
    if (!confirm(`Delete "${cat.name}"? Products in this category will not be deleted.`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
    } catch {
      alert('Failed to delete category');
    }
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#101828] mb-1">Categories</h1>
          <p className="text-sm text-[#4a5565]">Manage product categories</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-[#155dfc] animate-spin" />
          <span className="ml-3 text-[#4a5565]">Loading categories…</span>
        </div>
      ) : error ? (
        <div className="text-center p-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchCategories}
            className="px-4 py-2 bg-[#155dfc] text-white rounded-lg text-sm hover:bg-[#0d4dd9] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec] hover:shadow-md transition-shadow"
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
                    <h3 className="text-base font-semibold text-[#101828]">{category.name}</h3>
                    <p className="text-sm text-[#4a5565]">{category.productCount} products</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(category)}
                    className="p-1.5 text-[#4a5565] hover:text-[#155dfc] hover:bg-[#eff4ff] rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
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

          {/* Add New Category Card */}
          <button
            onClick={openAdd}
            className="bg-white rounded-xl p-5 shadow-sm border-2 border-dashed border-[#e4e7ec] hover:border-[#155dfc] hover:bg-[#eff4ff] transition-all flex flex-col items-center justify-center min-h-[140px] group"
          >
            <Plus className="w-8 h-8 text-[#4a5565] group-hover:text-[#155dfc] mb-2" />
            <span className="text-sm font-medium text-[#4a5565] group-hover:text-[#155dfc]">
              Add New Category
            </span>
          </button>
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
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">Icon Emoji</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="e.g., 🥤"
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
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
                className="flex-1 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
