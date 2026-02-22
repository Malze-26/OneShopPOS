'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Sparkles } from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: '',
    costPrice: '',
    initialStock: '',
    lowStockThreshold: '',
    category: '',
  });

  const generateSKU = () => {
    const randomSKU = `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setFormData({ ...formData, sku: randomSKU });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: POST to /api/products
    router.push('/products');
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Add Product</h1>
        <p className="text-sm text-[#4a5565]">Fill in the details to add a new product to your inventory</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#101828] mb-2">Product Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-[#101828] mb-2">SKU (Stock Keeping Unit)</label>
                  <div className="flex gap-2">
                    <input
                      id="sku"
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="SKU-XXXXX"
                      className="flex-1 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateSKU}
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[#101828] mb-2">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={4}
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sellingPrice" className="block text-sm font-medium text-[#101828] mb-2">Selling Price (LKR)</label>
                  <input
                    id="sellingPrice"
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="costPrice" className="block text-sm font-medium text-[#101828] mb-2">Cost Price (LKR)</label>
                  <input
                    id="costPrice"
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Inventory</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="initialStock" className="block text-sm font-medium text-[#101828] mb-2">Initial Stock Quantity</label>
                  <input
                    id="initialStock"
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-[#101828] mb-2">Low Stock Threshold</label>
                  <input
                    id="lowStockThreshold"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Product Images */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Product Images</h2>
              <div className="border-2 border-dashed border-[#e4e7ec] rounded-lg p-8 text-center hover:border-[#155dfc] hover:bg-[#eff4ff]/30 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-[#4a5565] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#101828] mb-1">Drag & drop images here</p>
                <p className="text-xs text-[#4a5565] mb-3">or click to browse</p>
                <button
                  type="button"
                  className="px-4 py-2 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors"
                >
                  Choose Files
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-center">
                    <span className="text-xs text-[#4a5565]">IMG</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Category</h2>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-[#101828] mb-2">Select Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                  required
                >
                  <option value="">Choose a category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Home & Garden">Home & Garden</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Sports">Sports</option>
                  <option value="Books">Books</option>
                  <option value="Toys">Toys</option>
                  <option value="Automotive">Automotive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-6 flex items-center justify-end gap-3 bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <Link
            href="/products"
            className="px-6 py-2 text-[#4a5565] hover:text-[#101828] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}
