'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';
import api from '@/app/lib/api';

interface GRNItem {
  productName: string;
  sku: string;
  quantityReceived: number;
  costPrice: number;
  subtotal: number;
}

interface GRNData {
  _id: string;
  grnNumber: string;
  supplier: string;
  referenceNumber: string;
  notes: string;
  items: GRNItem[];
  totalItems: number;
  totalCost: number;
  receivedBy: string;
  createdAt: string;
}

export default function GRNDetailPage() {
  const params = useParams();
  const [grn, setGrn] = useState<GRNData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/stocks/grns/${params.id}`)
      .then((res) => setGrn(res.data.data))
      .catch(() => setError('GRN not found'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#4a5565]">Loading GRN...</div>
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#f04438]">{error || 'GRN not found'}</div>
      </div>
    );
  }

  const dateStr = new Date(grn.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {/* Print styles — hidden in normal view, shown on print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #grn-print-area, #grn-print-area * { visibility: visible; }
          #grn-print-area { position: fixed; inset: 0; padding: 32px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 max-w-[900px]">
        {/* Nav bar — no-print */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href="/stocks" className="inline-flex items-center gap-1.5 text-sm text-[#4a5565] hover:text-[#155dfc] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Stocks
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print GRN
          </button>
        </div>

        {/* ── Printable GRN document ─────────────────────────────────────── */}
        <div id="grn-print-area" className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#e4e7ec]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#155dfc] rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">OS</span>
                  </div>
                  <div>
                    <div className="font-bold text-[#101828] text-lg">OneShop POS</div>
                    <div className="text-xs text-[#4a5565]">Goods Received Note</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#155dfc]">{grn.grnNumber}</div>
                <div className="text-sm text-[#4a5565] mt-1">{dateStr}</div>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Supplier</p>
                <p className="text-sm text-[#101828] font-medium">{grn.supplier || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Reference No.</p>
                <p className="text-sm text-[#101828]">{grn.referenceNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Received By</p>
                <p className="text-sm text-[#101828]">{grn.receivedBy}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Date</p>
                <p className="text-sm text-[#101828]">{dateStr}</p>
              </div>
            </div>

            {grn.notes && (
              <div className="mt-4 px-4 py-3 bg-[#f9fafb] rounded-lg">
                <p className="text-[10px] font-medium text-[#4a5565] uppercase tracking-wider mb-0.5">Notes</p>
                <p className="text-sm text-[#101828]">{grn.notes}</p>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Qty Received</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Cost Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#4a5565] uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {grn.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-6 py-4 text-sm text-[#4a5565]">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#101828]">{item.productName}</td>
                    <td className="px-6 py-4 text-sm text-[#4a5565] font-mono">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-[#101828] text-right">{item.quantityReceived}</td>
                    <td className="px-6 py-4 text-sm text-[#101828] text-right">LKR {item.costPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#101828] text-right">LKR {item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="px-8 py-6 border-t border-[#e4e7ec] bg-[#f9fafb]">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-12 text-sm">
                <span className="text-[#4a5565]">Total Items (qty)</span>
                <span className="font-semibold text-[#101828] min-w-[120px] text-right">{grn.totalItems}</span>
              </div>
              <div className="flex items-center gap-12 text-sm border-t border-[#e4e7ec] pt-2 mt-1">
                <span className="text-[#4a5565] font-medium">Total Cost</span>
                <span className="font-bold text-[#101828] text-lg min-w-[120px] text-right">LKR {grn.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signature section */}
          <div className="px-8 py-6 border-t border-[#e4e7ec] grid grid-cols-3 gap-8">
            {['Prepared By', 'Checked By', 'Approved By'].map((label) => (
              <div key={label} className="text-center">
                <div className="h-12 border-b border-dashed border-[#d0d5dd] mb-2"></div>
                <p className="text-xs text-[#4a5565]">{label}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-[#e4e7ec] text-center">
            <p className="text-[11px] text-[#4a5565]">
              This is a system-generated document from OneShop POS &nbsp;·&nbsp; {grn.grnNumber} &nbsp;·&nbsp; Generated on {dateStr}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
