'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductListHeader } from '@/app/components/ProductListHeader';
import { ProductTable } from '@/app/components/ProductTable';
import { SearchFilter } from '@/app/components/SearchFilter';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get('category') ?? 'all'
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <ProductListHeader />
      <SearchFilter
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        onSearchChange={setSearchQuery}
        onCategoryChange={setCategoryFilter}
      />
      <ProductTable searchQuery={searchQuery} categoryFilter={categoryFilter} />
    </div>
  );
}
