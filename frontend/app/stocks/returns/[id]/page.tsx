'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';

interface ReturnItem {
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reason: 'expired' | 'damaged';
  expiryDate: string | null;
  lossValue: number;
  retailValue: number;
}

interface ReturnData {
  _id: string;
  returnNumber: string;
  supplier: string;
  referenceNumber: string;
  notes: string;
  items: ReturnItem[];
  totalItems: number;
  totalLossValue: number;
  totalRetailValue: number;
  returnedBy: string;
  createdAt: string;
}

export default function ReturnDetailPage() {
  const { storeName, currency } = useStore();
  const params = useParams();
  const [ret, setRet] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/stocks/returns/${params.id}`)
      .then((res) => setRet(res.data.data))
      .catch(() => setError('Return not found'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#4a5565]">Loading return...</div>
      </div>
    );
  }

  if (error || !ret) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#f04438]">{error || 'Return not found'}</div>
      </div>
    );
  }

  const dateStr = new Date(ret.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const money = (n: number) => `${currency} ${n.toLocaleString()}`;

  return (
    <>
      {/* Print styles — hidden in normal view, shown on print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #return-print-area, #return-print-area * { visibility: visible; }
          #return-print-area { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 max-w-[900px]">
        {/* Nav bar — no-print */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href="/stocks/returns" className="inline-flex items-center gap-1.5 text-sm text-[#4a5565] hover:text-[var(--color-primary)] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Returns
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Return Note
          </button>
        </div>

        {/* ── Printable return document ──────────────────────────────────── */}
        <div id="return-print-area" className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#e4e7ec]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">OS</span>
                </div>
                <div>
                  <div className="font-bold text-[#101828] text-lg">{storeName}</div>
                  <div className="text-xs text-[#4a5565]">Supplier Return Note</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--color-primary)]">{ret.returnNumber}</div>
                <div className="text-sm text-[#4a5565] mt-1">{dateStr}</div>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Supplier</p>
                <p className="text-sm text-[#101828] font-medium">{ret.supplier || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Reference No.</p>
                <p className="text-sm text-[#101828]">{ret.referenceNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Returned By</p>
                <p className="text-sm text-[#101828]">{ret.returnedBy}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Date</p>
                <p className="text-sm text-[#101828]">{dateStr}</p>
              </div>
            </div>

            {ret.notes && (
              <div className="mt-4 px-4 py-3 bg-[#f9fafb] rounded-lg">
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Notes</p>
                <p className="text-sm text-[#101828]">{ret.notes}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider w-8">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Cost Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Loss Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {ret.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-6 py-4 text-sm text-[#4a5565]">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#101828]">{item.productName}</td>
                    <td className="px-6 py-4 text-sm text-[#4a5565] font-mono">{item.sku}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          item.reason === 'expired' ? 'bg-[#fffaeb] text-[#f79009]' : 'bg-[#fef3f2] text-[#f04438]'
                        }`}
                      >
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#4a5565] whitespace-nowrap">
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-CA') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#101828] text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-[#101828] text-right whitespace-nowrap">{money(item.costPrice)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#101828] text-right whitespace-nowrap">{money(item.lossValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="px-8 py-6 border-t border-[#e4e7ec] bg-[#f9fafb]">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-12 text-sm">
                <span className="text-[#4a5565]">Units Returned</span>
                <span className="font-semibold text-[#101828] min-w-[140px] text-right">{ret.totalItems}</span>
              </div>
              <div className="flex items-center gap-12 text-sm">
                <span className="text-[#4a5565]">Forgone Retail Value</span>
                <span className="font-semibold text-[#101828] min-w-[140px] text-right">{money(ret.totalRetailValue)}</span>
              </div>
              <div className="flex items-center gap-12 text-sm border-t border-[#e4e7ec] pt-2 mt-1">
                <span className="text-[#4a5565] font-medium">Deducted from Revenue</span>
                <span className="font-bold text-[#f04438] text-lg min-w-[140px] text-right">−{money(ret.totalLossValue)}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#4a5565] text-right mt-3">
              Stock was removed from inventory and revenue adjusted when this return was confirmed.
            </p>
          </div>

          {/* Signature section */}
          <div className="px-8 py-6 border-t border-[#e4e7ec] grid grid-cols-3 gap-8">
            {['Prepared By', 'Checked By', 'Received By (Supplier)'].map((label) => (
              <div key={label} className="text-center">
                <div className="h-12 border-b border-dashed border-[#d0d5dd] mb-2"></div>
                <p className="text-xs text-[#4a5565]">{label}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-[#e4e7ec] text-center">
            <p className="text-[11px] text-[#4a5565]">
              This is a system-generated document from {storeName} &nbsp;·&nbsp; {ret.returnNumber} &nbsp;·&nbsp; Generated on {dateStr}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
