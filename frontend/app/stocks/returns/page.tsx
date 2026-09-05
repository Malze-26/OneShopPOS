'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, ChevronLeft, ChevronRight, Search, AlertTriangle,
  PackageX, Undo2,
} from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';
import { formatStoreDate } from '@/app/lib/timezone';

interface ReturnItem {
  productName: string;
  sku: string;
  quantity: number;
  reason: 'expired' | 'damaged';
  lossValue: number;
}

interface ReturnRecord {
  _id: string;
  returnNumber: string;
  supplier: string;
  referenceNumber: string;
  items: ReturnItem[];
  totalItems: number;
  totalLossValue: number;
  returnedBy: string;
  createdAt: string;
}

interface ReturnStats {
  returnCount: number;
  totalUnits: number;
  totalLossValue: number;
  expired: { units: number; lossValue: number };
  damaged: { units: number; lossValue: number };
}

interface ExpiringProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  costPrice: number;
  expiryDate: string;
  daysLeft: number;
  expiryStatus: 'expired' | 'expiring-soon';
  atRiskValue: number;
}

const ITEMS_PER_PAGE = 10;

export default function SupplierReturnsPage() {
  const { currency } = useStore();
  const [tab, setTab] = useState<'returns' | 'expiring'>('returns');

  const [stats, setStats] = useState<ReturnStats | null>(null);

  // Return notes state
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Expiry watch state
  const [expiring, setExpiring] = useState<ExpiringProduct[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  const fetchStats = useCallback(() => {
    api.get('/stocks/returns/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: ITEMS_PER_PAGE };
      if (search) params.search = search;
      if (reasonFilter !== 'all') params.reason = reasonFilter;
      const res = await api.get('/stocks/returns', { params });
      setReturns(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, reasonFilter]);

  const fetchExpiring = useCallback(async () => {
    setExpiringLoading(true);
    try {
      const res = await api.get('/stocks/expiring', { params: { status: 'expired' } });
      setExpiring(res.data.data);
    } catch {
      // silent
    } finally {
      setExpiringLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReturns(); }, [fetchReturns]);
  useEffect(() => { fetchExpiring(); }, [fetchExpiring]);

  const expiredCount = expiring.filter((p) => p.expiryStatus === 'expired').length;

  const cards = [
    {
      label: 'Returns Recorded',
      value: String(stats?.returnCount ?? 0),
      sub: `${stats?.totalUnits ?? 0} units sent back`,
      icon: Undo2,
      bg: 'var(--color-primary-light)',
      color: 'var(--color-primary)',
    },
    {
      label: 'Damaged Stock Loss',
      value: fmt(stats?.damaged.lossValue ?? 0),
      sub: `${stats?.damaged.units ?? 0} units`,
      icon: PackageX,
      bg: '#fef3f2',
      color: '#f04438',
    },
  ];

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Supplier Returns</h1>
          <p className="text-sm text-[#4a5565] mt-0.5">
            Send expired and damaged stock back to suppliers — each return is deducted from revenue immediately
          </p>
        </div>
        <Link
          href="/stocks/returns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New Return
        </Link>
      </div>

      {/* Expired-stock nudge */}
      {expiredCount > 0 && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-[#fffaeb] border border-[#fec84b] rounded-xl">
          <AlertTriangle className="w-5 h-5 text-[#f79009] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#101828]">
              {expiredCount} product{expiredCount !== 1 ? 's have' : ' has'} expired stock on the shelf
            </p>
            <p className="text-sm text-[#4a5565] mt-0.5">
              Expired stock cannot be sold. Return it to the supplier to take it out of inventory.
            </p>
          </div>
          <button
            onClick={() => setTab('expiring')}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
          >
            Review now
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-[#4a5565]">{c.label}</p>
                <p className="text-xl font-bold text-[#101828] mt-1 truncate">{c.value}</p>
                <p className="text-xs text-[#4a5565] mt-1">{c.sub}</p>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ml-3"
                style={{ backgroundColor: c.bg }}
              >
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#e4e7ec]">
        {(['returns', 'expiring'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[#4a5565] hover:text-[#101828]'
            }`}
          >
            {t === 'returns' ? 'Return Notes' : `Expiry Watch${expiring.length ? ` (${expiring.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Return Notes Tab ──────────────────────────────────────────────── */}
      {tab === 'returns' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e4e7ec] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
              <input
                type="text"
                placeholder="Search return, supplier..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <select
              value={reasonFilter}
              onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[#101828]"
            >
              <option value="all">All Reasons</option>
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
            </select>
            <span className="text-sm text-[#4a5565] ml-auto">{total} record{total !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['Return No.', 'Date', 'Supplier', 'Reason', 'Units', 'Revenue Impact', 'Returned By', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">Loading...</td></tr>
                ) : returns.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">No returns recorded yet</td></tr>
                ) : (
                  returns.map((r) => {
                    const reasons = Array.from(new Set(r.items.map((i) => i.reason)));
                    return (
                      <tr key={r._id} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--color-primary)]">{r.returnNumber}</td>
                        <td className="px-6 py-4 text-sm text-[#101828] whitespace-nowrap">
                          {formatStoreDate(r.createdAt, undefined, 'en-CA')}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#101828]">{r.supplier || <span className="text-[#4a5565]">—</span>}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {reasons.map((reason) => (
                              <span
                                key={reason}
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                  reason === 'expired' ? 'bg-[#fffaeb] text-[#f79009]' : 'bg-[#fef3f2] text-[#f04438]'
                                }`}
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#101828]">{r.totalItems}</td>
                        <td className="px-6 py-4 text-sm font-medium text-[#f04438] whitespace-nowrap">
                          −{fmt(r.totalLossValue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#4a5565]">{r.returnedBy}</td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/stocks/returns/${r._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] hover:text-[var(--color-primary)] rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            View &amp; Print
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
            <p className="text-sm text-[#4a5565]">
              {total === 0 ? 'No records' : `Page ${page} of ${pages} — ${total} total`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages || total === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expiry Watch Tab ──────────────────────────────────────────────── */}
      {tab === 'expiring' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e4e7ec]">
            <h2 className="text-sm font-semibold text-[#101828]">Expired stock</h2>
            <p className="text-xs text-[#4a5565] mt-0.5">
              Products already past their expiry date and still on the shelf. &quot;At risk&quot; is what a full return would deduct from revenue.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['Product', 'SKU', 'Category', 'Expiry Date', 'Status', 'Stock', 'At Risk Value', 'Action'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {expiringLoading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">Loading...</td></tr>
                ) : expiring.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-[#4a5565]">
                    No expired stock on the shelf right now
                  </td></tr>
                ) : (
                  expiring.map((p) => (
                    <tr key={p._id} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-6 py-4 text-sm text-[#101828]">
                        <Link href={`/products/${p._id}`} className="hover:text-[var(--color-primary)] transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{p.sku}</td>
                      <td className="px-6 py-4 text-sm text-[#4a5565]">{p.category}</td>
                      <td className="px-6 py-4 text-sm text-[#101828] whitespace-nowrap">
                        {formatStoreDate(p.expiryDate, undefined, 'en-CA')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            p.expiryStatus === 'expired'
                              ? 'bg-[#fef3f2] text-[#f04438]'
                              : 'bg-[#fffaeb] text-[#f79009]'
                          }`}
                        >
                          {p.expiryStatus === 'expired'
                            ? `Expired ${Math.abs(p.daysLeft)}d ago`
                            : p.daysLeft === 0 ? 'Expires today' : `${p.daysLeft}d left`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#101828]">{p.stock}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[#101828] whitespace-nowrap">{fmt(p.atRiskValue)}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/stocks/returns/new?productId=${p._id}&reason=expired`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] hover:text-[var(--color-primary)] rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Return
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
