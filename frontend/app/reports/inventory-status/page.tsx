"use client"

import { useState } from "react"
import { Search, TrendingUp, AlertTriangle, Siren } from "lucide-react"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/app/components/ui/native-select"
import { ReportsTabs } from '../../components/ReportsTabs'
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar'
import { Action } from "@radix-ui/react-alert-dialog"

const productData = [
  { sku: 'AU-001', name: 'Wireless Headphones', cost: 2500, retail:4000, stock:15 ,value:37500,status: 'In Stock',Action: 'Edit'},
  { sku: 'EL-102', name: 'USB-C Hub', cost: 5000, retail:8500, stock:2 ,value:37500,status: 'Low Stock',Action: 'Edit'},
  { sku: 'AU-002', name: 'Wireless Headphones', cost: 2500, retail:4000, stock:0 ,value:37500,status: 'Out of Stock',Action: 'Edit'},
  { sku: 'AU-003', name: 'Wireless Headphones', cost: 2500, retail:4000, stock:8 ,value:37500,status: 'In Stock',Action: 'Edit'}, 
]

export default function Inventorystatus() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="p-4 md:p-6 max-w-[1400px] bg-[#fcfcfd] min-h-screen">
      <div className="mb-6">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#101828]">Inventory Status Report</h2>
        <p className="text-sm text-[#667085] mt-1">
          Real-time overview of your store's stock performance and value.
        </p>
      </div>

      {/* ✅ Updated Summary Cards Layout to match the image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Total Asset Value */}
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-2">Total Asset Value</p>
            <h3 className="text-3xl font-bold text-[#101828] mb-4">Rs. 1,250,000</h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-sm text-[#667085] italic font-medium">Cost Price</span>
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> +4.2%
            </span>
          </div>
        </div>

        {/* Est. Retail Value */}
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-2">Est. Retail Value</p>
            <h3 className="text-3xl font-bold text-[#101828] mb-4">Rs. 1,850,000</h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-sm text-[#667085] italic font-medium">Selling Price</span>
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> +12.8%
            </span>
          </div>
        </div>

        {/* Stock Alerts Card */}
        <div className="bg-[#fff9f4] border border-[#ffedd5] rounded-xl p-5 shadow-sm flex flex-col">
          <p className="text-xs font-bold text-[#c2410c] uppercase tracking-wider mb-4">Stock Alerts</p>
          
          <div className="space-y-4">
            {/* Low Stock Alert */}
            <div className="flex items-start gap-3">
              <div className="bg-[#ffedd5] p-2.5 rounded-lg text-[#ea580c]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-[#9a3412]">12 Low Stock</p>
                <p className="text-[10px] text-[#ea580c] uppercase font-bold mt-0.5 tracking-wide">Immediate Attention</p>
              </div>
            </div>
            
            {/* Out of Stock Alert */}
            <div className="flex items-start gap-3">
              <div className="bg-[#ffe4e6] p-2.5 rounded-lg text-[#e11d48]">
                <Siren className="w-5 h-5" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-[#9f1239]">3 Out of Stock</p>
                <p className="text-[10px] text-[#e11d48] uppercase font-bold mt-0.5 tracking-wide">Critical Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e4e7ec] rounded-xl shadow-sm overflow-hidden">
        {/* Table Header / Filters */}
        <div className="p-4 border-b border-[#e4e7ec] flex flex-wrap gap-3 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              placeholder="Search Product / SKU..."
              className="w-full pl-10 pr-4 py-2 border border-[#d0d5dd] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Categories</NativeSelectOption>
               <NativeSelectOption value="">Baby Products</NativeSelectOption>
                <NativeSelectOption value="">Bakery</NativeSelectOption>
                 <NativeSelectOption value="">Beverages</NativeSelectOption>
                  <NativeSelectOption value="">Canned& Preserved</NativeSelectOption>
                   <NativeSelectOption value="">Chilled Food</NativeSelectOption>
                    <NativeSelectOption value="">Confectionery</NativeSelectOption>
                    <NativeSelectOption value="">Cooking Essentials</NativeSelectOption>
                    <NativeSelectOption value="">Diary</NativeSelectOption>
                    <NativeSelectOption value="">Cleaning & Laundry</NativeSelectOption>
            </NativeSelect>
            
            <NativeSelect className="w-40">
              <NativeSelectOption value="">All Channels</NativeSelectOption>
              <NativeSelectOption value="">POS(In-store)</NativeSelectOption>
              <NativeSelectOption value="">E-commerce(Online)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">SKU</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Product Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Cost(Rs.)</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Retail(Rs.)</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Value(Rs.)</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f7]">
              {productData.map((product, idx) => (
                <tr key={`${product.sku}-${idx}`} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-[#101828]">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-[#475467]">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-[#475467]">{product.cost}</td>
                  <td className="px-6 py-4 text-sm text-right text-[#475467]">{product.retail}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-[#101828]">{product.stock}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-[#101828]">{product.value}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#667085]">Showing 1-4 of 4</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Prev</button>
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}