// app/products/page.tsx
'use client';

import React, { Suspense } from 'react';
import ProductsContent from './ProductsContent';

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}