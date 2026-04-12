import { ChevronRight } from 'lucide-react';

export function AddProductHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <button className="hover:text-indigo-600 transition-colors">Products</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Add Product</span>
      </div>
      
      <div>
        <h1 className="text-gray-900 mb-2">Add New Product</h1>
        <p className="text-gray-600">Fill in the details below to add a new product to your inventory</p>
      </div>
    </div>
  );
}
