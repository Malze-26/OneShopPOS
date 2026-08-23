'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, Undo2 } from 'lucide-react';
import api from '@/app/lib/api';

interface GRNRecord {
  _id: string;
  grnNumber: string;
  supplier: string;
  referenceNumber: string;
  totalItems: number;
  totalCost: number;
  receivedBy: string;
  createdAt: string;
}

interface StockMovement {
  _id: string;
  product: { _id: string; name: string; sku: string } | null;
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
  by: string;
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function StocksPage() {
  const [tab, setTab] = useState<'grns' | 'movements'>('grns');

  // GRN state
  const [grns, setGrns] = useState<GRNRecord[]>([]);
  const [grnTotal, setGrnTotal] = useState(0);
  const [grnPage, setGrnPage] = useState(1);
  const [grnPages, setGrnPages] = useState(1);
  const [grnSearch, setGrnSearch] = useState('');
  const [grnLoading, setGrnLoading] = useState(false);

  // Movements state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movPages, setMovPages] = useState(1);
  const [movTypeFilter, setMovTypeFilter] = useState('all');
  const [movLoading, setMovLoading] = useState(false);

  const fetchGRNs = useCallback(async () => {
    setGrnLoading(true);
    try {
      const params: Record<string, string | number> = { page: grnPage, limit: ITEMS_PER_PAGE };
      if (grnSearch) params.search = grnSearch;
      const res = await api.get('/stocks/grns', { params });
      setGrns(res.data.data);
      setGrnTotal(res.data.total);
      setGrnPages(res.data.pages);
    } catch {
      // silent
    } finally {
      setGrnLoading(false);
    }
  }, [grnPage, grnSearch]);

  const fetchMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const params: Record<string, string | number> = { page: movPage, limit: ITEMS_PER_PAGE };
      if (movTypeFilter !== 'all') params.type = movTypeFilter;
      const res = await api.get('/stocks/history', { params });
      setMovements(res.data.data);
      setMovTotal(res.data.total);
      setMovPages(res.data.pages);
    } catch {
      // silent
    } finally {
      setMovLoading(false);
    }
  }, [movPage, movTypeFilter]);

  useEffect(() => { fetchGRNs(); }, [fetchGRNs]);
  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
   
          <p className="text-sm text-[#4a5565] mt-0.5">Manage goods received notes and stock movements</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/stocks/returns"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] hover:text-[var(--color-primary)] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Undo2 className="w-4 h-4" />
            Supplier Returns
          </Link>
          <Link
            href="/stocks/receive"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Receive Goods
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#e4e7ec]">
        {(['grns', 'movements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[#4a5565] hover:text-[#101828]'
            }`}
          >
            {t === 'grns' ? 'GRN Records' : 'Stock Movements'}
          </button>
        ))}
      </div>

      {/* ── GRN Records Tab ─────────────────────────────────────────────── */}
      {tab === 'grns' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          {/* Search bar */}
          <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
              <input
                type="text"
                placeholder="Search GRN, supplier, product..."
                value={grnSearch}
                onChange={(e) => { setGrnSearch(e.target.value); setGrnPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <span className="text-sm text-[#4a5565] ml-auto">{grnTotal} record{grnTotal !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['GRN Number', 'Date', 'Supplier', 'Ref. No.', 'Items Qty', 'Total Cost', 'Received By', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {grnLoading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">Loading...</td></tr>
                ) : grns.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">No GRN records found</td></tr>
                ) : (
                  grns.map((grn) => (
                    <tr key={grn._id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">{grn.grnNumber}</td>
                      <td className="px-6 py-4 text-sm text-[#101828] whitespace-nowrap">
                        {new Date(grn.createdAt).toLocaleDateString('en-CA')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#101828]">{grn.supplier || <span className="text-[#4a5565]">—</span>}</td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{grn.referenceNumber || '—'}</td>
                      <td className="px-6 py-4 text-sm text-[#101828]">{grn.totalItems}</td>
                      <td className="px-6 py-4 text-sm text-[#101828]">LKR {grn.totalCost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{grn.receivedBy}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/stocks/grn/${grn._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] hover:text-[var(--color-primary)] rounded-lg text-xs font-medium transition-colors"
                        >
                          View &amp; Print
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
            <p className="text-sm text-[#4a5565]">
              {grnTotal === 0 ? 'No records' : `Page ${grnPage} of ${grnPages} — ${grnTotal} total`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setGrnPage((p) => p - 1)}
                disabled={grnPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setGrnPage((p) => p + 1)}
                disabled={grnPage === grnPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Movements Tab ──────────────────────────────────────────── */}
      {tab === 'movements' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center gap-3">
            <select
              value={movTypeFilter}
              onChange={(e) => { setMovTypeFilter(e.target.value); setMovPage(1); }}
              className="px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[#101828]"
            >
              <option value="all">All Types</option>
              <option value="add">Stock In</option>
              <option value="remove">Stock Out</option>
            </select>
            <span className="text-sm text-[#4a5565] ml-auto">{movTotal} record{movTotal !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['Date', 'Product', 'SKU', 'Type', 'Qty', 'Reason', 'Done By'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {movLoading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-[#4a5565]">Loading...</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-[#4a5565]">No stock movements found</td></tr>
                ) : (
                  movements.map((mov) => (
                    <tr key={mov._id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-6 py-4 text-sm text-[#101828] whitespace-nowrap">
                        {new Date(mov.createdAt).toLocaleDateString('en-CA')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#101828]">
                        {mov.product ? (
                          <Link href={`/products/${mov.product._id}`} className="hover:text-[var(--color-primary)] transition-colors">
                            {mov.product.name}
                          </Link>
                        ) : <span className="text-[#4a5565]">Deleted product</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{mov.product?.sku ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${mov.type === 'add' ? 'bg-[#ecfdf3] text-[#12b76a]' : 'bg-[#fef3f2] text-[#f04438]'}`}>
                          {mov.type === 'add' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {mov.type === 'add' ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#101828]">
                        <span className={mov.type === 'add' ? 'text-[#12b76a]' : 'text-[#f04438]'}>
                          {mov.type === 'add' ? '+' : '-'}{mov.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4a5565] max-w-[240px] truncate">{mov.reason}</td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{mov.by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
            <p className="text-sm text-[#4a5565]">
              {movTotal === 0 ? 'No records' : `Page ${movPage} of ${movPages} — ${movTotal} total`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMovPage((p) => p - 1)}
                disabled={movPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setMovPage((p) => p + 1)}
                disabled={movPage === movPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
