import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useState } from 'react';

const categoriesData = [
  { id: 1, name: 'Electronics', icon: '📱', productCount: 245, color: '#155dfc' },
  { id: 2, name: 'Clothing', icon: '👕', productCount: 189, color: '#7f56d9' },
  { id: 3, name: 'Food & Beverage', icon: '🍕', productCount: 412, color: '#f79009' },
  { id: 4, name: 'Home & Garden', icon: '🏠', productCount: 156, color: '#12b76a' },
  { id: 5, name: 'Beauty', icon: '💄', productCount: 98, color: '#ee46bc' },
  { id: 6, name: 'Sports', icon: '⚽', productCount: 73, color: '#3b82f6' },
  { id: 7, name: 'Books', icon: '📚', productCount: 54, color: '#ef4444' },
  { id: 8, name: 'Toys', icon: '🧸', productCount: 121, color: '#f59e0b' },
  { id: 9, name: 'Automotive', icon: '🚗', productCount: 67, color: '#6366f1' },
];

export function CategoriesPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#101828] mb-1">Categories</h1>
          <p className="text-sm text-[#4a5565]">Manage product categories</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoriesData.map((category) => (
          <div
            key={category.id}
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
                <button className="p-1.5 text-[#4a5565] hover:text-[#155dfc] hover:bg-[#eff4ff] rounded transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[#4a5565] hover:text-[#f04438] hover:bg-[#fef3f2] rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-2 bg-[#f9fafb] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((category.productCount / 500) * 100, 100)}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </div>
        ))}

        {/* Add New Category Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white rounded-xl p-5 shadow-sm border-2 border-dashed border-[#e4e7ec] hover:border-[#155dfc] hover:bg-[#eff4ff] transition-all flex flex-col items-center justify-center min-h-[140px] group"
        >
          <Plus className="w-8 h-8 text-[#4a5565] group-hover:text-[#155dfc] mb-2" />
          <span className="text-sm font-medium text-[#4a5565] group-hover:text-[#155dfc]">
            Add New Category
          </span>
        </button>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#101828]">Add New Category</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#4a5565] hover:text-[#101828]"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Electronics"
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Icon Emoji
                </label>
                <input
                  type="text"
                  placeholder="e.g., 📱"
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {['#155dfc', '#7f56d9', '#f79009', '#12b76a', '#ee46bc', '#3b82f6'].map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-lg border-2 border-[#e4e7ec] hover:border-[#101828] transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e7ec] flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
