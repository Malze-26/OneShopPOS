"use client"

import { useState, useEffect } from "react"
import { Search, ShoppingCart, Star, Shapes } from "lucide-react"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/app/components/ui/native-select"
import { ReportsTabs } from '../../components/ReportsTabs'
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar'

export default function SalesByProductPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [summaryData, setSummaryData] = useState<any>(null)
  const [productData, setProductData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSalesData()
  }, [])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/reports/sales-by-product', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sales data')
      }

      const data = await response.json()
      setSummaryData(data.summary)
      setProductData(data.products || [])
    } catch (err) {
      console.error('Error fetching sales data:', err)
      setError('Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }

  const summaryCards = summaryData ? [
    { 
      title: 'Total Units Sold', 
      value: summaryData.totalUnitsSold?.toString() || '0', 
      valueClass: 'text-[36px] leading-tight', 
      icon: ShoppingCart 
    },
    { 
      title: 'Top Grossing Item', 
      value: summaryData.topGrossingItem || 'N/A', 
      subtext: `Rs. ${(summaryData.topGrossingAmount || 0).toLocaleString()}`, 
      valueClass: 'text-[20px]', 
      icon: Star 
    },
    { 
      title: 'Top Category', 
      value: summaryData.topCategory || 'N/A', 
      subtext: `Rs. ${(summaryData.topCategoryRevenue || 0).toLocaleString()}`, 
      valueClass: 'text-[20px]', 
      icon: Shapes 
    }
  ] : []

  const filteredProducts = productData.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-[1400px] bg-[#fcfcfd] min-h-screen">
      <div className="mb-6">
        <ReportsTabs />
        <ReportsDateToolbar />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#101828]">Sales by Product</h2>
        <p className="text-sm text-[#667085] mt-1">
          Top-performing products by units sold and revenue
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl border border-[#f2f4f7] p-5 shadow-sm flex flex-col justify-between min-h-[130px]">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[13px] font-semibold text-[#667085]">{card.title}</p>
                <div className="bg-[#f4f3ff] rounded-full p-1.5 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#8a94a6]" fill="currentColor" />
                </div>
              </div>
              <div>
                <h3 className={`${card.valueClass} font-bold text-[#101828]`}>{card.value}</h3>
                {card.subtext && <p className="text-sm font-medium text-[#667085] mt-1">{card.subtext}</p>}
              </div>
            </div>
          )
        })}
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
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase">Category</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Qty Sold</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#667085] uppercase text-right">Net Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f7]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-[#667085]">Loading...</td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.sku} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-[#101828]">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-[#475467]">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-[#475467]">{product.category}</td>
                    <td className="px-6 py-4 text-sm text-right text-[#475467]">{product.qty}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-[#101828]">Rs. {product.sales.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-[#667085]">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#667085]">Showing 1-{Math.min(filteredProducts.length, 10)} of {filteredProducts.length}</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Prev</button>
            <button className="px-4 py-2 text-sm font-medium border border-[#d0d5dd] rounded-lg text-[#344054] disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}