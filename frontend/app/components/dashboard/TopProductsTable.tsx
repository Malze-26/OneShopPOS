'use client';

import Link from 'next/link';
import { TopProduct } from './types';

interface TopProductsTableProps {
  products: TopProduct[];
  currency: string;
}

/**
 * Ranked list of the best-selling products for the current week.
 * Shows rank, emoji icon, name, units sold, and revenue per product.
 *
 * TODO: Wire up a real API endpoint (e.g. GET /api/products/top-selling?limit=5)
 *       to replace the placeholder data.
 */
export function TopProductsTable({ products, currency }: TopProductsTableProps) {
  return (
    <div className="lg:col-span-4 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Top Selling Products</h2>
          <p className="text-xs text-[#4a5565] mt-1">This week&apos;s best performers</p>
        </div>
        <Link
          href="/products"
          className="text-sm text-[var(--color-primary)] hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.rank}
            className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] rounded-lg transition-colors"
          >
            <div className="w-6 h-6 flex items-center justify-center bg-[#f9fafb] rounded text-xs font-semibold text-[#4a5565]">
              {product.rank}
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-[#eff4ff] rounded text-lg">
              {product.image}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#101828] truncate">{product.name}</div>
              <div className="text-xs text-[#4a5565]">{product.units} units sold</div>
            </div>
            <div className="text-sm font-semibold text-[#101828]">
              {currency} {product.revenue.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
