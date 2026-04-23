'use client';

import { useState } from 'react';
import { Search, TrendingUp, AlertTriangle, Siren } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/app/components/ui/native-select';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';

const productData = [
  { sku: 'AU-001', name: 'Wireless Headphones', cost: 2500,  retail: 4000, stock: 15, value: 37500, status: 'In Stock' },
  { sku: 'EL-102', name: 'USB-C Hub',           cost: 5000,  retail: 8500, stock: 2,  value: 10000, status: 'Low Stock' },
  { sku: 'AU-002', name: 'Bluetooth Speaker',   cost: 2500,  retail: 4000, stock: 0,  value: 0,     status: 'Out of Stock' },
  { sku: 'AU-003', name: 'Smart Watch',         cost: 2500,  retail: 4000, stock: 8,  value: 20000, status: 'In Stock' },
];

const statusConfig: Record<string, { bg: string; text: string }> = {
  'In Stock':     { bg: '#ecfdf3', text: '#12b76a' },
  'Low Stock':    { bg: '#fffaeb', text: '#f79009' },
  'Out of Stock': { bg: '#fef3f2', text: '#f04438' },
};

export default function InventoryStatusPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = productData.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-4">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828]">Inventory Status Report</h1>
        <p className="text-sm text-[#4a5565] mt-1">Real-time overview of your store&apos;s stock performance and value.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Total Asset Value</p>
          <h3 className="text-2xl font-bold text-[#101828] mb-3">Rs. 1,250,000</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4a5565]">Cost Price</span>
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#12b76a' }}>
              <TrendingUp className="w-3.5 h-3.5" /> +4.2%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565] mb-1">Est. Retail Value</p>
          <h3 className="text-2xl font-bold text-[#101828] mb-3">Rs. 1,850,000</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4a5565]">Selling Price</span>
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#12b76a' }}>
              <TrendingUp className="w-3.5 h-3.5" /> +12.8%
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
                <p className="text-sm font-semibold text-[#101828]">12 Low Stock</p>
                <p className="text-xs text-[#4a5565]">Immediate attention</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3f2' }}>
                <Siren className="w-5 h-5" style={{ color: '#f04438' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#101828]">3 Out of Stock</p>
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
                {['SKU', 'Product Name', 'Cost (Rs.)', 'Retail (Rs.)', 'Stock', 'Value (Rs.)', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {filtered.map((product) => (
                <tr key={product.sku} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-[var(--color-primary)]">{product.sku}</td>
                  <td className="px-5 py-4 text-sm text-[#101828]">{product.name}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{product.cost.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{product.retail.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{product.stock}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{product.value.toLocaleString()}</td>
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
                  <td className="px-5 py-4">
                    <button className="text-sm font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">Showing 1 to {filtered.length} of {productData.length} products</p>
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
