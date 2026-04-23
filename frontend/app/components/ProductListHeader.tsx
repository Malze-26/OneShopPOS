import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';

export function ProductListHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          
          <p className="text-gray-600">Manage your product inventory and stock levels</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products/import"
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:border-[var(--color-primary)] hover:bg-[#eff4ff] transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </Link>

          <Link
            href="/products/add"
            className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
