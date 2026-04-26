'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Star, Shapes } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import { useSearchParams } from 'next/navigation';
import api from '@/app/lib/api';

interface SummaryData {
  totalUnitsSold: number;
  topGrossingItem: string;
  topGrossingAmount: number;
  topCategory: string;
  topCategoryRevenue: number;
}

interface ProductRow {
  sku: string;
  name: string;
  category: string;
  qty: number;
  sales: number;
}

export default function SalesByProductPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [productData, setProductData] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/reports/sales-by-product?preset=${preset}`);
        const data = response.data;
        setSummaryData(data.summary);
        setProductData(data.products ?? []);
      } catch {
        setError('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [preset]);

  const summaryCards = summaryData
    ? [
      {
        title: 'Total Units Sold',
        value: summaryData.totalUnitsSold.toLocaleString(),
        subtext: 'units this period',
        icon: ShoppingCart,
        iconBg: 'var(--color-primary-light)',
        iconColor: 'var(--color-primary)',
      },
      {
        title: 'Top Grossing Item',
        value: summaryData.topGrossingItem || 'N/A',
        subtext: `Rs. ${(summaryData.topGrossingAmount ?? 0).toLocaleString()}`,
        icon: Star,
        iconBg: '#fffaeb',
        iconColor: '#f79009',
      },
      {
        title: 'Top Category',
        value: summaryData.topCategory || 'N/A',
        subtext: `Rs. ${(summaryData.topCategoryRevenue ?? 0).toLocaleString()}`,
        icon: Shapes,
        iconBg: '#f4f3ff',
        iconColor: '#7f56d9',
      },
    ]
    : [];

  const filtered = productData.filter(
    (p) =>
      (p?.name?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? '') ||
      (p?.sku?.toLowerCase() ?? '').includes(searchTerm?.toLowerCase() ?? ''),
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Sales by Product</h1>
        <p className="text-sm text-[#4a5565] mt-1">Top-performing products by units sold and revenue</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#fef3f2] border border-[#fecdca] rounded-lg text-sm text-[#f04438]">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-[#4a5565] mb-1">{card.title}</p>
                    <h3 className="text-2xl font-bold text-[#101828] mb-1">{card.value}</h3>
                    <p className="text-xs text-[#4a5565]">{card.subtext}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-6 h-6" style={{ color: card.iconColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Categories</NativeSelectOption>
              <NativeSelectOption value="baby">Baby Products</NativeSelectOption>
              <NativeSelectOption value="bakery">Bakery</NativeSelectOption>
              <NativeSelectOption value="beverages">Beverages</NativeSelectOption>
            </NativeSelect>
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Channels</NativeSelectOption>
              <NativeSelectOption value="pos">POS (In-store)</NativeSelectOption>
              <NativeSelectOption value="online">E-commerce (Online)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['SKU', 'Product Name', 'Category', 'Unit Price', 'Stock', 'Qty Sold', 'Net Sales'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#4a5565]">Loading...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((product) => (
                  <tr key={product.sku} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{product.sku}</td>
                    <td className="px-5 py-4 text-sm text-[#101828]">{product.name}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.category}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">Rs. {product.unitPrice?.toLocaleString() ?? 0}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.stock ?? 0}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{product.qty}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#101828]">Rs. {product.sales.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#4a5565]">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">
            Showing 1 to {Math.min(filtered.length, 10)} of {filtered.length} products
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] rounded-lg text-sm font-medium transition-colors" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
