"use client"

import { useState } from "react"
import { Search, User, Star, PieChart, ArrowUp } from "lucide-react"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/app/components/ui/native-select"
import { ReportsTabs } from '../../components/ReportsTabs'
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar'

// Updated productData to fix the rendering errors in the table mapping below
const productData = [
  { name: 'Wireless Headphones', phone: '0712345678', type: 'Returning', order: 12, spent: 'Rs. 60,000', loyality: 'Gold' },
  { name: 'USB-C Cable 2m', phone: '0779876543', type: 'New', order: 1, spent: 'Rs. 22,500', loyality: 'Silver' },
  { name: 'Mechanical Keyboard', phone: '0754567890', type: 'Returning', order: 5, spent: 'Rs. 45,000', loyality: 'Platinum' },
]

export default function CustomerActivityPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="p-4 md:p-6 max-w-[1400px] bg-[#fcfcfd] min-h-screen">
      <div className="mb-6">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#101828]">Daily Customer Activity</h2>
        <p className="text-sm text-[#667085] mt-1">
          Real-time overview of customer interactions and transactional performance.
        </p>
      </div>

      {/* ✅ Updated Summary Cards Section to match the image exactly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        
        {/* Unique Customers Card */}
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2">Unique Customers</p>
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-bold text-[#101828]">142</h3>
              <span className="inline-flex items-center text-xs font-bold bg-[#ecfdf3] text-[#027a48] px-2 py-0.5 rounded-md">
                <ArrowUp className="w-3 h-3 mr-0.5" /> 12
              </span>
            </div>
          </div>
          <p className="text-sm text-[#98a2b3] font-medium">vs. yesterday</p>
        </div>

        {/* Top Spender Card */}
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
              <Star className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2">Top Spender</p>
            <h3 className="text-xl font-bold text-[#101828]">Nimal Perera</h3>
          </div>
          <p className="text-sm font-bold text-blue-600">Rs. 45,000</p>
        </div>

        {/* New vs Returning Card */}
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
              <PieChart className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2">New vs Returning</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-[#101828]">85%</h3>
              <span className="text-sm text-[#667085] font-medium">Returning</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#667085] font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 85% Returning
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 15% New
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
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Customer Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Orders</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Total Spent</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Loyality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f7]">
              {/* Note: Updated map to use the keys defined in productData */}
              {productData.map((customer, idx) => (
                <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-[#101828]">{customer.name}</td>
                  <td className="px-6 py-4 text-sm text-[#475467]">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-[#475467]">{customer.type}</td>
                  <td className="px-6 py-4 text-sm text-right text-[#475467]">{customer.order}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-[#101828]">{customer.spent}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-[#101828]">{customer.loyality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#667085]">Showing 1-3 of 3</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Prev</button>
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}