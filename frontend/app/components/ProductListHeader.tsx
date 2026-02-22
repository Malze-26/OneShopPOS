import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';

export function ProductListHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product inventory and stock levels</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products/import"
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </Link>

          <Link
            href="/products/add"
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
