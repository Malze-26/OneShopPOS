'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Edit, ArrowLeftRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

const product = {
  id: '1',
  name: 'Product 001',
  sku: 'SKU-001',
  category: 'Category A',
  description: 'This is a detailed description of Product 001. It includes all the relevant information about the product features, specifications, and usage instructions.',
  sellingPrice: 1250,
  costPrice: 850,
  stock: 150,
  lowStockThreshold: 20,
  status: 'in-stock',
};

const stockHistory = [
  { date: '2026-02-20', type: 'add', quantity: 100, reason: 'New Stock Received', by: 'Chamara Silva' },
  { date: '2026-02-18', type: 'remove', quantity: 25, reason: 'Sales', by: 'System' },
  { date: '2026-02-15', type: 'add', quantity: 50, reason: 'Supplier Delivery', by: 'Chamara Silva' },
  { date: '2026-02-12', type: 'remove', quantity: 10, reason: 'Damaged Goods', by: 'Store Manager' },
  { date: '2026-02-10', type: 'add', quantity: 75, reason: 'Stock Correction', by: 'Chamara Silva' },
];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'in-stock': { label: 'In Stock', bg: '#ecfdf3', text: '#12b76a' },
  'low-stock': { label: 'Low Stock', bg: '#fffaeb', text: '#f79009' },
  'out-of-stock': { label: 'Out of Stock', bg: '#fef3f2', text: '#f04438' },
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    // TODO: DELETE /api/products/:id
    router.push('/products');
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <Link
          href={`/products/${params.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Product
        </Link>
        <button className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors">
          <ArrowLeftRight className="w-4 h-4" />
          Adjust Stock
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-[#f04438] hover:bg-[#fef3f2] rounded-lg text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left - Product Images */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <div className="aspect-square bg-[#f9fafb] border border-[#e4e7ec] rounded-lg mb-4 flex items-center justify-center">
            <span className="text-4xl text-[#4a5565]">IMG</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-[#f9fafb] border-2 border-transparent hover:border-[#155dfc] rounded-lg cursor-pointer flex items-center justify-center transition-colors">
                <span className="text-xs text-[#4a5565]">IMG</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Product Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
            <h1 className="text-2xl font-bold text-[#101828] mb-2">{product.name}</h1>
            <p className="text-sm text-[#4a5565] mb-4">SKU: {product.sku}</p>
            <div className="flex items-center gap-4 mb-4">
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: statusConfig[product.status]?.bg, color: statusConfig[product.status]?.text }}
              >
                {statusConfig[product.status]?.label}
              </span>
              <span className="px-3 py-1 bg-[#f9fafb] text-[#101828] text-sm rounded-full">{product.category}</span>
            </div>
            <div className="border-t border-[#e4e7ec] pt-4 mb-4">
              <p className="text-sm text-[#4a5565] leading-relaxed">{product.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Selling Price</p>
                <p className="text-2xl font-bold text-[#101828]">LKR {product.sellingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Cost Price</p>
                <p className="text-lg font-semibold text-[#4a5565]">LKR {product.costPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Stock Info Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
            <h2 className="text-base font-semibold text-[#101828] mb-4">Stock Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#f9fafb] rounded-lg">
                <p className="text-xs text-[#4a5565] mb-1">Current Stock</p>
                <p className="text-3xl font-bold text-[#101828]">{product.stock}</p>
              </div>
              <div className="p-4 bg-[#f9fafb] rounded-lg">
                <p className="text-xs text-[#4a5565] mb-1">Low Stock Threshold</p>
                <p className="text-3xl font-bold text-[#f79009]">{product.lowStockThreshold}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">Stock History</h2>
          <p className="text-xs text-[#4a5565] mt-1">All stock adjustments for this product</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Date', 'Adjustment Type', 'Qty Change', 'Reason', 'Done By'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {stockHistory.map((record, idx) => (
                <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-6 py-4 text-sm text-[#101828]">{record.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${record.type === 'add' ? 'bg-[#ecfdf3] text-[#12b76a]' : 'bg-[#fef3f2] text-[#f04438]'}`}>
                      {record.type === 'add' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {record.type === 'add' ? 'Added' : 'Removed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#101828]">
                    {record.type === 'add' ? '+' : '-'}{record.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#4a5565]">{record.reason}</td>
                  <td className="px-6 py-4 text-sm text-[#4a5565]">{record.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">Showing 1 to 5 of 5 records</p>
          <div className="flex gap-2">
            <button disabled className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button disabled className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#101828] mb-2">Delete Product</h3>
            <p className="text-sm text-[#4a5565] mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-[#f04438] hover:bg-[#d03030] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
