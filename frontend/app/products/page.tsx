'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductListHeader } from '@/app/components/ProductListHeader';
import { ProductTable } from '@/app/components/ProductTable';
import { SearchFilter } from '@/app/components/SearchFilter';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
