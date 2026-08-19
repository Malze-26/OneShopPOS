'use client';

import Link from 'next/link';
import { Package as PackageIcon } from 'lucide-react';
import { TopProduct } from './types';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

interface TopProductsTableProps {
  products: TopProduct[];
}

/**
 * Ranked list of the best-selling products over the last 30 days
 * (GET /api/dashboard/top-products).
 * Shows rank, product image, name, and units sold per product.
 */
export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <div className="lg:col-span-4 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Top Selling Products</h2>
          <p className="text-xs text-[#4a5565] mt-1">Last 30 days&apos; best performers</p>
        </div>
        <Link
          href="/products"
          className="text-sm text-[var(--color-primary)] hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {products.length === 0 && (
          <p className="text-sm text-[#4a5565] py-4 text-center">No sales in the last 30 days.</p>
        )}
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] rounded-lg transition-colors"
          >
            <div className="w-6 h-6 flex items-center justify-center bg-[#f9fafb] rounded text-xs font-semibold text-[#4a5565]">
              {product.rank}
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-[var(--color-primary-light)] rounded overflow-hidden flex-shrink-0">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${SERVER_URL}${product.image}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PackageIcon className="w-4 h-4 text-[var(--color-primary)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#101828] truncate">{product.name}</div>
            </div>
            <div className="text-sm font-semibold text-[#101828] flex-shrink-0">
              {product.units} units sold
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
