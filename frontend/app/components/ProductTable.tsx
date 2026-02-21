import { useState, useMemo } from 'react';
import { Edit2, Package as PackageIcon, ChevronLeft, ChevronRight, Boxes } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: string;
  image: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: 'in-stock' | 'low-stock';
}

const mockProducts: Product[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop',
    name: 'Samsung Galaxy A54 5G',
    sku: 'MOB-SAM-A54-001',
    category: 'Mobile Phones',
    price: 89990,
    stock: 45,
    status: 'in-stock'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=80&h=80&fit=crop',
    name: 'Dell Inspiron 15 Laptop',
    sku: 'LAP-DEL-INS-002',
    category: 'Computers & Laptops',
    price: 145000,
    stock: 12,
    status: 'low-stock'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop',
    name: 'Sony WH-1000XM5 Headphones',
    sku: 'AUD-SON-WH5-003',
    category: 'Audio & Sound',
    price: 65000,
    stock: 28,
    status: 'in-stock'
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=80&h=80&fit=crop',
    name: 'Logitech MX Master 3S Mouse',
    sku: 'ACC-LOG-MX3-004',
    category: 'Accessories',
    price: 15500,
    stock: 8,
    status: 'low-stock'
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=80&h=80&fit=crop',
    name: 'Apple iPhone 15 Pro',
    sku: 'MOB-APP-IP15-005',
    category: 'Mobile Phones',
    price: 285000,
    stock: 18,
    status: 'in-stock'
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=80&h=80&fit=crop',
    name: 'Keychron K2 Mechanical Keyboard',
    sku: 'ACC-KEY-K2V-006',
    category: 'Accessories',
    price: 18500,
    stock: 35,
    status: 'in-stock'
  },
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=80&h=80&fit=crop',
    name: 'JBL Flip 6 Bluetooth Speaker',
    sku: 'AUD-JBL-FL6-007',
    category: 'Audio & Sound',
    price: 24500,
    stock: 9,
    status: 'low-stock'
  },
  {
    id: '8',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=80&h=80&fit=crop',
    name: 'Asus ROG Strix Gaming Laptop',
    sku: 'LAP-ASU-ROG-008',
    category: 'Computers & Laptops',
    price: 325000,
    stock: 6,
    status: 'low-stock'
  },
  {
    id: '9',
    image: 'https://images.unsplash.com/photo-1635514569146-9a9607ecf303?w=80&h=80&fit=crop',
    name: 'Anker PowerCore 20000mAh',
    sku: 'ACC-ANK-PC2-009',
    category: 'Accessories',
    price: 8500,
    stock: 52,
    status: 'in-stock'
  },
  {
    id: '10',
    image: 'https://images.unsplash.com/photo-1621768216002-5ac171876625?w=80&h=80&fit=crop',
    name: 'Xiaomi Redmi Note 12 Pro',
    sku: 'MOB-XIA-RN12-010',
    category: 'Mobile Phones',
    price: 67500,
    stock: 41,
    status: 'in-stock'
  },
  {
    id: '11',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=80&h=80&fit=crop',
    name: 'Apple MacBook Air M2',
    sku: 'LAP-APP-MBA-011',
    category: 'Computers & Laptops',
    price: 285000,
    stock: 7,
    status: 'low-stock'
  },
  {
    id: '12',
    image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=80&h=80&fit=crop',
    name: 'Bose QuietComfort 45',
    sku: 'AUD-BOS-QC4-012',
    category: 'Audio & Sound',
    price: 58500,
    stock: 15,
    status: 'in-stock'
  },
  {
    id: '13',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=80&h=80&fit=crop',
    name: 'LG 27" 4K Monitor',
    sku: 'ELE-LG-27M-013',
    category: 'Electronics',
    price: 75000,
    stock: 10,
    status: 'low-stock'
  },
  {
    id: '14',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=80&h=80&fit=crop',
    name: 'Canon EOS M50 Camera',
    sku: 'ELE-CAN-M50-014',
    category: 'Electronics',
    price: 125000,
    stock: 8,
    status: 'low-stock'
  },
  {
    id: '15',
    image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=80&h=80&fit=crop',
    name: 'Samsung Galaxy Watch 6',
    sku: 'ACC-SAM-GW6-015',
    category: 'Accessories',
    price: 48500,
    stock: 22,
    status: 'in-stock'
  }
];

interface ProductTableProps {
  searchQuery: string;
  categoryFilter: string;
}

const ITEMS_PER_PAGE = 10;

export function ProductTable({ searchQuery, categoryFilter }: ProductTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getStatusBadge = (status: Product['status'], stock: number) => {
    const isLowStock = status === 'low-stock';
    
    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 px-3 py-1.5 rounded-lg text-sm ${
          isLowStock 
            ? 'bg-amber-100 text-amber-700' 
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isLowStock ? 'Low Stock' : 'In Stock'}
        </div>
      </div>
    );
  };

  const formatPrice = (price: number) => {
    return `Rs ${price.toLocaleString('en-LK')}`;
  };

  if (filteredProducts.length === 0) {
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
          <button className="px-6 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md transition-all">
            Add Your First Product
          </button>
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
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Stock Quantity
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedProducts.map((product) => {
              const isLowStock = product.status === 'low-stock';
              
              return (
                <tr 
                  key={product.id} 
                  className={`transition-colors ${
                    isLowStock 
                      ? 'bg-amber-50/30 hover:bg-amber-50/50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                      <span className="text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600 text-sm font-mono">{product.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{formatPrice(product.price)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-900 ${isLowStock ? 'text-amber-700' : ''}`}>
                        {product.stock} units
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(product.status, product.stock)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="group flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-sm">Edit</span>
                      </button>
                      <button 
                        className="group flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Adjust Stock"
                      >
                        <Boxes className="w-4 h-4" />
                        <span className="text-sm">Adjust Stock</span>
                      </button>
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
          Showing <span className="text-gray-900">{startIndex + 1}</span> to <span className="text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)}</span> of <span className="text-gray-900">{filteredProducts.length}</span> products
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
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
