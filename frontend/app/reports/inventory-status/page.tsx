'use client';

import { useEffect, useState } from 'react';
import { Search, TrendingUp, AlertTriangle, Siren } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import { useSearchParams } from 'next/navigation';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import api from '@/app/lib/api';

interface Product {
  id: string; sku: string; name: string; category: string;
  cost: number; retail: number; stock: number; value: number; retailValue: number; status: string;
}
interface Summary {
  totalAssetValue: number; totalRetailValue: number;
  lowStockCount: number; outOfStockCount: number; totalProducts: number;
}
interface ApiResponse { summary: Summary; products: Product[] }

const statusConfig: Record<string, { bg: string; text: string }> = {
  'In Stock': { bg: '#ecfdf3', text: '#12b76a' },
  'Low Stock': { bg: '#fffaeb', text: '#f79009' },
  'Out of Stock': { bg: '#fef3f2', text: '#f04438' },
};

export default function InventoryStatusPage() {
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [categoryFilter, setCategory] = useState('');

  const fetchData = () => {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);

    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);

    api.get<ApiResponse>(`/reports/inventory-status?${params.toString()}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, categoryFilter, preset, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const products = data?.products ?? [];
  const summary = data?.summary;

  const filtered = products.filter(
    (p) =>
      (p?.name?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? '') ||
      (p?.sku?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? ''),
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar showRanges={['today', 'last-7-days', 'this-month', 'custom']} />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Inventory Status Report</h1>
        <p className="text-sm text-[#4a5565] mt-1">Real-time overview of your store&apos;s stock performance and value.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Total Asset Value</p>
          <h3 className="text-2xl font-bold text-[#101828] mb-3">
            {loading ? '—' : `Rs. ${(summary?.totalAssetValue ?? 0).toLocaleString()}`}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4a5565]">Cost Price × Qty</span>
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#12b76a' }}>
              <TrendingUp className="w-3.5 h-3.5" /> {summary?.totalProducts ?? 0} products
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Est. Retail Value</p>
          <h3 className="text-2xl font-bold text-[#101828] mb-3">
            {loading ? '—' : `Rs. ${(summary?.totalRetailValue ?? 0).toLocaleString()}`}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4a5565]">Selling Price × Qty</span>
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#12b76a' }}>
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-3">Stock Alerts</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fffaeb' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#f79009' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#101828]">{summary?.lowStockCount ?? 0} Low Stock</p>
                <p className="text-xs text-[#4a5565]">Immediate attention</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3f2' }}>
                <Siren className="w-5 h-5" style={{ color: '#f04438' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#101828]">{summary?.outOfStockCount ?? 0} Out of Stock</p>
                <p className="text-xs text-[#4a5565]">Critical status</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec] flex flex-wrap gap-3 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect
              className="w-40"
              value={categoryFilter}
              onChange={(e) => setCategory(e.target.value)}
            >
              <NativeSelectOption value="">All Categories</NativeSelectOption>
              <NativeSelectOption value="Vegetables">Vegetables</NativeSelectOption>
              <NativeSelectOption value="Fruits">Fruits</NativeSelectOption>
              <NativeSelectOption value="Bakery">Bakery</NativeSelectOption>
              <NativeSelectOption value="Beverages">Beverages</NativeSelectOption>
              <NativeSelectOption value="Snacks">Snacks</NativeSelectOption>
              <NativeSelectOption value="Dairy">Dairy</NativeSelectOption>
              <NativeSelectOption value="Meat">Meat</NativeSelectOption>
              <NativeSelectOption value="Other">Other</NativeSelectOption>
              <NativeSelectOption value="Frozen">Frozen</NativeSelectOption>
              <NativeSelectOption value="Electronics">Electronics</NativeSelectOption>
              <NativeSelectOption value="Clothing">Clothing</NativeSelectOption>
              <NativeSelectOption value="Home Goods">Home Goods</NativeSelectOption>
              <NativeSelectOption value="Beauty">Beauty</NativeSelectOption>
              <NativeSelectOption value="Pet Supplies">Pet Supplies</NativeSelectOption>
              <NativeSelectOption value="Cleaning Supplies">Cleaning Supplies</NativeSelectOption>
              <NativeSelectOption value="Food Staples">Food Staples</NativeSelectOption>



            </NativeSelect>
            <NativeSelect className="w-40" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
              <NativeSelectOption value="">All Statuses</NativeSelectOption>
              <NativeSelectOption value="In Stock">In Stock</NativeSelectOption>
              <NativeSelectOption value="Low Stock">Low Stock</NativeSelectOption>
              <NativeSelectOption value="Out of Stock">Out of Stock</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['SKU', 'Product Name', 'Cost (Rs.)', 'Retail (Rs.)', 'Quantity',
                  'Cost Value (Rs.)', 'Retail Value (Rs.)', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-sm text-[#4a5565] text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-sm text-[#4a5565] text-center">No products found</td></tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[var(--color-primary)]">{product.sku}</td>
                    <td className="px-5 py-4 text-sm text-[#101828]">{product.name}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.cost.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.retail.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{product.stock}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.value.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.retailValue.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusConfig[product.status]?.bg,
                          color: statusConfig[product.status]?.text,
                        }}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565]">
            Showing {filtered.length} of {products.length} products
          </p>
        </div>
      </div>
    </div>
  );
}
