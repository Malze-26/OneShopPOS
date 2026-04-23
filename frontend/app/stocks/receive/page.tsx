'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ChevronLeft, Search } from 'lucide-react';
import api from '@/app/lib/api';

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  category: string;
}

interface LineItem {
  id: string;
  product: Product | null;
  productSearch: string;
  showDropdown: boolean;
  searchResults: Product[];
  quantityReceived: number;
  costPrice: number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function newLine(): LineItem {
  return {
    id: uid(),
    product: null,
    productSearch: '',
    showDropdown: false,
    searchResults: [],
    quantityReceived: 1,
    costPrice: 0,
  };
}

export default function ReceiveGoodsPage() {
  const router = useRouter();

  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Search debounce per line
  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    if (!query.trim()) return [];
    try {
      const res = await api.get('/products', { params: { search: query } });
      return res.data.data.slice(0, 8);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, idx) => {
      if (!line.showDropdown) return;
      const t = setTimeout(async () => {
        const results = await searchProducts(line.productSearch);
        setLines((prev) =>
          prev.map((l, i) => (i === idx ? { ...l, searchResults: results } : l))
        );
      }, 300);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.map((l) => l.productSearch + l.showDropdown).join(','), searchProducts]);

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function handleSearchChange(idx: number, val: string) {
    updateLine(idx, { productSearch: val, showDropdown: true, product: null, searchResults: [] });
  }

  function selectProduct(idx: number, product: Product) {
    updateLine(idx, {
      product,
      productSearch: `${product.name} (${product.sku})`,
      showDropdown: false,
      costPrice: product.costPrice,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalQty = lines.reduce((s, l) => s + (l.quantityReceived || 0), 0);
  const totalCost = lines.reduce((s, l) => s + (l.quantityReceived || 0) * (l.costPrice || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validLines = lines.filter((l) => l.product);
    if (validLines.length === 0) {
      setError('Please add at least one product.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/stocks/grns', {
        supplier,
        referenceNumber,
        notes,
        items: validLines.map((l) => ({
          productId: l.product!._id,
          quantityReceived: l.quantityReceived,
          costPrice: l.costPrice,
        })),
      });
      router.push(`/stocks/grn/${res.data.data._id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-[1000px]">
      {/* Back */}
      <Link href="/stocks" className="inline-flex items-center gap-1.5 text-sm text-[#4a5565] hover:text-[var(--color-primary)] mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Stocks
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Receive Goods</h1>
        <p className="text-sm text-[#4a5565] mt-0.5">Create a Goods Received Note (GRN) to add stock</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GRN Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h2 className="text-sm font-semibold text-[#101828] mb-4">GRN Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. ABC Distributors"
                className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Reference / PO Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PO-2025-0042"
                className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#101828]">Products Received</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e4e7ec] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[40%]">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[15%]">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[15%]">Qty Received</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[20%]">Cost Price (LKR)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[10%]">Subtotal</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {lines.map((line, idx) => (
                  <tr key={line.id}>
                    {/* Product search */}
                    <td className="px-4 py-3 relative">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a5565] pointer-events-none" />
                        <input
                          type="text"
                          value={line.productSearch}
                          onChange={(e) => handleSearchChange(idx, e.target.value)}
                          onFocus={() => updateLine(idx, { showDropdown: true })}
                          onBlur={() => setTimeout(() => updateLine(idx, { showDropdown: false }), 150)}
                          placeholder="Search product..."
                          className="w-full pl-8 pr-3 py-1.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                        />
                        {line.showDropdown && line.searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e4e7ec] rounded-lg shadow-lg z-20 overflow-hidden">
                            {line.searchResults.map((p) => (
                              <button
                                key={p._id}
                                type="button"
                                onMouseDown={() => selectProduct(idx, p)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f9fafb] transition-colors"
                              >
                                <span className="font-medium text-[#101828]">{p.name}</span>
                                <span className="text-[#4a5565] ml-2 text-xs">{p.sku}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 text-sm text-[#4a5565]">{line.product?.sku ?? '—'}</td>

                    {/* Quantity */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={line.quantityReceived}
                        onChange={(e) => updateLine(idx, { quantityReceived: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 px-2 py-1.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-center"
                      />
                    </td>

                    {/* Cost Price */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.costPrice}
                        onChange={(e) => updateLine(idx, { costPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-28 px-2 py-1.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-sm text-[#101828] font-medium whitespace-nowrap">
                      LKR {((line.quantityReceived || 0) * (line.costPrice || 0)).toLocaleString()}
                    </td>

                    {/* Remove */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="p-1 text-[#f04438] hover:bg-[#fef3f2] rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-end gap-8">
            <div className="text-sm text-[#4a5565]">
              Total Qty: <span className="font-semibold text-[#101828]">{totalQty}</span>
            </div>
            <div className="text-sm text-[#4a5565]">
              Total Cost: <span className="font-semibold text-[#101828]">LKR {totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-[#f04438] bg-[#fef3f2] px-4 py-3 rounded-lg border border-[#fecdca]">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/stocks" className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save GRN'}
          </button>
        </div>
      </form>
    </div>
  );
}
