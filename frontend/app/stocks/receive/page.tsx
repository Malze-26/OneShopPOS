'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ChevronLeft, Search, Upload, Download, AlertCircle, X, Sparkles } from 'lucide-react';
import api from '@/app/lib/api';

interface Product {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  category: string;
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

// GRN lines receive stock for products that already exist in the catalog —
// unlike the product CSV import, this one never creates a product, so the
// only columns needed are which SKU and how much/at what cost.
const GRN_TEMPLATE_CSV = [
  'sku,quantity_received,cost_price',
  'BEV-001,50,130',
  'SNK-003,24,180',
].join('\n');

interface ParsedGRNRow {
  row: number;
  sku: string;
  quantityReceived: number;
  costPrice: number | null;
}

function parseGRNCSV(text: string): ParsedGRNRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const get = (values: string[], ...keys: string[]) => {
    for (const key of keys) {
      const i = headers.indexOf(key);
      if (i !== -1) return values[i] ?? '';
    }
    return '';
  };

  return lines.slice(1).map((line, i) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const sku = get(values, 'sku', 'product_sku');
    const qtyRaw = get(values, 'quantity_received', 'quantity', 'qty');
    const costRaw = get(values, 'cost_price', 'cost');

    return {
      row: i + 2, // +1 for header, +1 for 1-based row numbering
      sku,
      quantityReceived: parseInt(qtyRaw) || 0,
      costPrice: costRaw ? parseFloat(costRaw) || 0 : null,
    };
  });
}

export default function ReceiveGoodsPage() {
  const router = useRouter();

  // Goods are received from a supplier on the suppliers page — the server
  // rejects anything else, so the form offers the real list rather than a box.
  const [supplier, setSupplier] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    api.get('/suppliers').then((r) => setSuppliers(r.data.data)).catch(() => {});
  }, []);

  const [referenceNumber, setReferenceNumber] = useState('');
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchNextReference = useCallback(async () => {
    setReferenceLoading(true);
    try {
      const res = await api.get('/stocks/grns/next-reference');
      setReferenceNumber(res.data.data.referenceNumber);
    } catch {
      // silent — the real number is still assigned server-side on save
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  useEffect(() => { fetchNextReference(); }, [fetchNextReference]);

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

  // Looks up one SKU against the catalog — the search endpoint matches
  // substrings, so an exact (case-insensitive) match is picked out of the
  // results rather than trusting the first hit.
  const findBySku = useCallback(async (sku: string): Promise<Product | null> => {
    try {
      const res = await api.get('/products', { params: { search: sku } });
      const results = res.data.data as Product[];
      return results.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const handleCSVFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportErrors(['Please upload a CSV file (.csv)']);
      return;
    }

    const text = await file.text();
    const parsedRows = parseGRNCSV(text);
    if (parsedRows.length === 0) {
      setImportErrors(['The file appears to be empty or has no data rows.']);
      return;
    }

    setImporting(true);
    setImportErrors([]);
    try {
      const resolved = await Promise.all(
        parsedRows.map(async (row) => {
          if (!row.sku) return { row, error: 'Missing SKU' };
          if (row.quantityReceived <= 0) return { row, error: 'Quantity received must be greater than 0' };
          const product = await findBySku(row.sku);
          if (!product) return { row, error: `SKU "${row.sku}" was not found in the catalog` };
          return { row, product };
        })
      );

      const errors = resolved
        .filter((r): r is { row: ParsedGRNRow; error: string } => 'error' in r)
        .map((r) => `Row ${r.row.row}: ${r.error}`);

      const newLines = resolved
        .filter((r): r is { row: ParsedGRNRow; product: Product } => 'product' in r)
        .map(({ row, product }) => ({
          id: uid(),
          product,
          productSearch: `${product.name} (${product.sku})`,
          showDropdown: false,
          searchResults: [],
          quantityReceived: row.quantityReceived,
          costPrice: row.costPrice ?? product.costPrice,
        }));

      setImportErrors(errors);
      if (newLines.length > 0) setLines(newLines);
    } finally {
      setImporting(false);
    }
  }, [findBySku]);

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

  function handleDownloadTemplate() {
    const blob = new Blob([GRN_TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grn_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    if (!supplier) {
      setError('Please choose the supplier these goods came from.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/stocks/grns', {
        supplierId: supplier,
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
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Supplier *</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5565] mb-1.5">Reference / PO Number</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referenceLoading ? 'Generating…' : referenceNumber}
                  readOnly
                  className="flex-1 px-3 py-2 border border-[#e4e7ec] bg-[#f9fafb] rounded-lg text-sm text-[#101828] font-mono tracking-wide focus:outline-none"
                />
                <button
                  type="button"
                  onClick={fetchNextReference}
                  disabled={referenceLoading}
                  title="Get the next PO number"
                  className="p-2 border border-[#e4e7ec] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#4a5565] mt-1">Auto-generated — guaranteed unique</p>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e4e7ec] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCSVFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e4e7ec] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="px-6 py-3 bg-[#fef3f2] border-b border-[#fecdca]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f04438] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-[#7a271a] space-y-0.5">
                    {importErrors.map((msg, i) => <p key={i}>{msg}</p>)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImportErrors([])}
                  className="text-[#7a271a] hover:opacity-70 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

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
