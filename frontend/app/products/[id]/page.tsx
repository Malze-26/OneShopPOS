'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Edit, ArrowLeftRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '@/app/lib/api';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  images: string[];
}

interface StockHistoryEntry {
  _id: string;
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
  by: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'in-stock': { label: 'In Stock', bg: '#ecfdf3', text: '#12b76a' },
  'low-stock': { label: 'Low Stock', bg: '#fffaeb', text: '#f79009' },
  'out-of-stock': { label: 'Out of Stock', bg: '#fef3f2', text: '#f04438' },
};

const ITEMS_PER_PAGE = 10;

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = params.id as string;
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data.data);
        setStockHistory(res.data.stockHistory ?? []);
      })
      .catch(() => setError('Product not found'))
      .finally(() => setFetchLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${params.id}`);
      router.push('/products');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to delete product');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#4a5565]">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#f04438]">{error || 'Product not found'}</div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(stockHistory.length / ITEMS_PER_PAGE));
  const pagedHistory = stockHistory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div className="flex items-center gap-3">
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
      </div>

      {/* Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left - Product Images */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          {product.images.length > 0 ? (
            <>
              <div className="aspect-square bg-[#f9fafb] border border-[#e4e7ec] rounded-lg mb-4 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${SERVER_URL}${product.images[activeImage]}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === activeImage ? 'border-[#155dfc]' : 'border-transparent hover:border-[#155dfc]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${SERVER_URL}${src}`} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-center">
              <span className="text-sm text-[#4a5565]">No images</span>
            </div>
          )}
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
            {product.description && (
              <div className="border-t border-[#e4e7ec] pt-4 mb-4">
                <p className="text-sm text-[#4a5565] leading-relaxed">{product.description}</p>
              </div>
            )}
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
              {pagedHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#4a5565]">No stock history yet</td>
                </tr>
              ) : (
                pagedHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-6 py-4 text-sm text-[#101828]">
                      {new Date(record.createdAt).toLocaleDateString('en-CA')}
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">
            {stockHistory.length === 0
              ? 'No records'
              : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1} to ${Math.min(page * ITEMS_PER_PAGE, stockHistory.length)} of ${stockHistory.length} records`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
            >
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
              Are you sure you want to delete <span className="font-medium text-[#101828]">{product.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-[#f04438] hover:bg-[#d03030] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
