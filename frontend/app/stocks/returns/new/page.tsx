'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ChevronLeft, Search, TrendingDown } from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';

type Reason = 'expired' | 'damaged';

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  expiryDate: string | null;
  expiryStatus: 'expired' | 'expiring-soon' | 'fresh' | null;
}

interface Supplier {
  _id: string;
  name: string;
}

interface LineItem {
  id: string;
  product: Product | null;
  productSearch: string;
  showDropdown: boolean;
  searchResults: Product[];
  quantity: number;
  reason: Reason;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function newLine(reason: Reason = 'expired'): LineItem {
  return {
    id: uid(),
    product: null,
    productSearch: '',
    showDropdown: false,
    searchResults: [],
    quantity: 1,
    reason,
  };
}

function NewReturnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency } = useStore();

  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  useEffect(() => {
    api.get('/suppliers')
      .then((res) => setSuppliers(res.data.data ?? []))
      .catch(() => {});
  }, []);

  // Prefill the first line when arriving from the Expiry Watch list.
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId) return;
    const reason = (searchParams.get('reason') === 'damaged' ? 'damaged' : 'expired') as Reason;

    api.get(`/products/${productId}`)
      .then((res) => {
        const p: Product = res.data.data;
        setLines([{
          ...newLine(reason),
          product: p,
          productSearch: `${p.name} (${p.sku})`,
          // Expired stock is returned in full — nothing on that batch is sellable.
          quantity: Math.max(1, p.stock),
        }]);
      })
      .catch(() => {});
  }, [searchParams]);

  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    if (!query.trim()) return [];
    try {
      const res = await api.get('/products', { params: { search: query } });
      // Only stock that actually exists can be sent back.
      return res.data.data.filter((p: Product) => p.stock > 0).slice(0, 8);
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
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, searchResults: results } : l)));
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
      quantity: Math.min(lines[idx].quantity || 1, product.stock),
      // An already-expired product almost always means an expiry return.
      reason: product.expiryStatus === 'expired' ? 'expired' : lines[idx].reason,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalQty = lines.reduce((s, l) => s + (l.product ? l.quantity || 0 : 0), 0);
  const totalLoss = lines.reduce(
    (s, l) => s + (l.product ? (l.quantity || 0) * l.product.costPrice : 0),
    0
  );
  const totalRetail = lines.reduce(
    (s, l) => s + (l.product ? (l.quantity || 0) * l.product.sellingPrice : 0),
    0
  );

  // Mirrors the server check, so an over-return is caught before submitting.
  const overStockLine = lines.find((l) => l.product && l.quantity > l.product.stock);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validLines = lines.filter((l) => l.product);
    if (validLines.length === 0) {
      setError('Please add at least one product.');
      return;
    }
    if (overStockLine) {
      setError(`Cannot return more than the ${overStockLine.product!.stock} units in stock for "${overStockLine.product!.name}".`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/stocks/returns', {
        supplierId: supplierId || undefined,
        supplier: supplierId ? undefined : supplierName,
        referenceNumber,
        notes,
        items: validLines.map((l) => ({
          productId: l.product!._id,
          quantity: l.quantity,
          reason: l.reason,
        })),
      });
      router.push(`/stocks/returns/${res.data.data._id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to create return');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-[1100px]">
      <Link
        href="/stocks/returns"
        className="inline-flex items-center gap-1.5 text-sm text-[#4a5565] hover:text-[var(--color-primary)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Returns
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Return to Supplier</h1>
        <p className="text-sm text-[#4a5565] mt-0.5">
          Send expired or damaged stock back. Saving removes the units from inventory and deducts their cost from revenue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Return details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h2 className="text-sm font-semibold text-[#101828] mb-4">Return Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Supplier</label>
              {suppliers.length > 0 ? (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[#101828] bg-white"
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. ABC Distributors"
                  className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Reference / Debit Note No.</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. DN-2026-0012"
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

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#101828]">Products Returned</h2>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[30%]">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[13%]">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[9%]">In Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[11%]">Return Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[14%]">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#4a5565] uppercase w-[15%]">Revenue Impact</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {lines.map((line, idx) => {
                  const overStock = !!line.product && line.quantity > line.product.stock;
                  return (
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
                                  <span className="text-[#4a5565] ml-2 text-xs">· {p.stock} in stock</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {line.product?.expiryDate ? (
                          <span className={line.product.expiryStatus === 'expired' ? 'text-[#f04438] font-medium' : 'text-[#101828]'}>
                            {new Date(line.product.expiryDate).toLocaleDateString('en-CA')}
                          </span>
                        ) : (
                          <span className="text-[#4a5565]">—</span>
                        )}
                      </td>

                      {/* In stock */}
                      <td className="px-4 py-3 text-sm text-[#4a5565]">{line.product?.stock ?? '—'}</td>

                      {/* Quantity */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={line.product?.stock ?? undefined}
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`w-20 px-2 py-1.5 border rounded-lg text-sm focus:outline-none text-center ${
                            overStock
                              ? 'border-[#f04438] text-[#f04438] focus:border-[#f04438]'
                              : 'border-[#e4e7ec] focus:border-[var(--color-primary)]'
                          }`}
                        />
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3">
                        <select
                          value={line.reason}
                          onChange={(e) => updateLine(idx, { reason: e.target.value as Reason })}
                          className="w-full px-2 py-1.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[#101828] bg-white"
                        >
                          <option value="expired">Expired</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </td>

                      {/* Impact */}
                      <td className="px-4 py-3 text-sm font-medium text-[#f04438] whitespace-nowrap">
                        {line.product ? `−${fmt((line.quantity || 0) * line.product.costPrice)}` : '—'}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-[#e4e7ec] flex flex-wrap items-center justify-end gap-8">
            <div className="text-sm text-[#4a5565]">
              Units Returned: <span className="font-semibold text-[#101828]">{totalQty}</span>
            </div>
            <div className="text-sm text-[#4a5565]">
              Forgone Retail Value: <span className="font-semibold text-[#101828]">{fmt(totalRetail)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#4a5565]">
              <TrendingDown className="w-4 h-4 text-[#f04438]" />
              Deducted from Revenue: <span className="font-semibold text-[#f04438]">−{fmt(totalLoss)}</span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#f04438] bg-[#fef3f2] px-4 py-3 rounded-lg border border-[#fecdca]">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/stocks/returns" className="px-4 py-2 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !!overStockLine}
            className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Confirm Return'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewReturnPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#4a5565]">Loading...</div>}>
      <NewReturnForm />
    </Suspense>
  );
}
