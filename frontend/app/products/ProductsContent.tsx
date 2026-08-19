// app/products/ProductsContent.tsx
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, Loader2 } from 'lucide-react';
import { ProductListHeader } from '@/app/components/ProductListHeader';
import { ProductTable } from '@/app/components/ProductTable';
import { SearchFilter } from '@/app/components/SearchFilter';
import api from '@/app/lib/api';

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get('category') ?? 'all'
  );
  const [totalProducts, setTotalProducts] = useState<number | null>(null);

  useEffect(() => {
    api.get('/products/stats').then((res) => setTotalProducts(res.data.total)).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-[1400px]">
      <Suspense fallback={<div className="mb-4">Loading header...</div>}>
        <ProductListHeader />
      </Suspense>

      {/* Stat tile */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-4 bg-white rounded-xl px-6 py-4 shadow-sm border border-[#e4e7ec] min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-xs text-[#4a5565] font-medium uppercase tracking-wide">Total Products</p>
            {totalProducts === null ? (
              <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin mt-1" />
            ) : (
              <p className="text-2xl font-bold text-[#101828]">{totalProducts}</p>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="mb-4">Loading filters...</div>}>
        <SearchFilter
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategoryFilter}
        />
      </Suspense>
      <Suspense fallback={<div className="py-8 text-center text-sm text-[#4a5565]">Loading products...</div>}>
        <ProductTable searchQuery={searchQuery} categoryFilter={categoryFilter} />
      </Suspense>
    </div>
  );
}