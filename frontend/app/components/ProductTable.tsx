'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Edit2, Package as PackageIcon, ChevronLeft, ChevronRight, Boxes, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

interface ProductTableProps {
  searchQuery: string;
  categoryFilter: string;
}

const ITEMS_PER_PAGE = 10;

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'in-stock':     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Stock' },
  'low-stock':    { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Low Stock' },
  'out-of-stock': { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Out of Stock' },
};

export function ProductTable({ searchQuery, categoryFilter }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;

      const res = await api.get('/products', { params });
      setProducts(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
      setCurrentPage(1);
    } catch {
      setError('Failed to load products. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading products…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PackageIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-gray-900 text-xl mb-2">No Products Found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first product'}
          </p>
          <Link
            href="/products/add"
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all inline-block"
          >
            Add Your First Product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product', 'SKU', 'Category', 'Price', 'Stock Quantity', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((product) => {
              const style = statusStyles[product.status] ?? statusStyles['in-stock'];
              const isLow = product.status === 'low-stock';

              return (
                <tr
                  key={product._id}
                  className={`transition-colors ${isLow ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <PackageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-gray-900 font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600 text-sm font-mono">{product.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">Rs {product.sellingPrice.toLocaleString('en-LK')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`${isLow ? 'text-amber-700' : 'text-gray-900'}`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-sm ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${product._id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-sm">Edit</span>
                      </Link>
                      <Link
                        href={`/products/${product._id}`}
                        className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Adjust Stock"
                      >
                        <Boxes className="w-4 h-4" />
                        <span className="text-sm">Adjust Stock</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing{' '}
          <span className="text-gray-900">{products.length === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span className="text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, products.length)}</span> of{' '}
          <span className="text-gray-900">{total}</span> products
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-gray-300 text-gray-700 hover:bg-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
