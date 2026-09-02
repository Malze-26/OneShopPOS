'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, Lock, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReportsDateToolbar } from '../../components/ReportsDateToolbar';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ShiftInfo {
  storeName: string; storeId: string; register: string;
  cashier: string; cashierId: string; openedAt: string;
}
interface ZSummary {
  grossSales: number; discounts: number; refunds: number;
  netSales: number; taxCollected: number; totalTransactions: number;
}
interface PaymentRow { method: string; amount: number; txCount: number }
interface Reconciliation { openingFloat: number; cashSales: number; expectedCash: number }

interface ApiResponse {
  dateRange: string;
  generatedAt: string;
  shiftInfo: ShiftInfo;
  summary: ZSummary;
  paymentBreakdown: PaymentRow[];
  reconciliation: Reconciliation;
}

export default function DailyZReportPage() {
  const { currency } = useStore();
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset') || 'today';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState<string>('');
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);

    api.get<ApiResponse>(`/reports/daily-z-report?${params.toString()}`)
      .then(({ data: d }) => setData(d))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [preset, searchParams]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const cashValue = parseFloat(actualCash) || 0;
  const baseOpeningFloat = data?.reconciliation?.openingFloat ?? 0;
  const displayOpeningFloat = openingFloatInput !== '' ? (parseFloat(openingFloatInput) || 0) : baseOpeningFloat;
  const baseExpectedCash = data?.reconciliation?.expectedCash ?? 0;
  const cashSales = data?.reconciliation?.cashSales ?? 0;
  
  // Recalculate expected cash if manager overrides opening float
  const expectedCash = openingFloatInput !== '' ? (displayOpeningFloat + cashSales) : baseExpectedCash;
  const overShort = cashValue - expectedCash;

  const handleExport = () => {
    try {
      if (!data) return;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(18);
      doc.setTextColor(16, 24, 40);
      doc.text('Z-Report (End of Day)', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(74, 85, 101);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${data.generatedAt || '--:--'}`, pageWidth / 2, 28, { align: 'center' });

      let yPos = 40;

      // Shift Info
      autoTable(doc, {
        startY: yPos,
        body: [
          ['Store:', data.shiftInfo?.storeName || 'N/A', 'Cashier:', data.shiftInfo?.cashier || 'Unknown'],
          ['Store ID:', data.shiftInfo?.storeId || '---', 'Cashier ID:', data.shiftInfo?.cashierId || '---']
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 }
      });
      yPos = ((doc as any).lastAutoTable?.finalY || yPos + 30) + 10;

      // Financial Summary
      doc.setFontSize(12);
      doc.setTextColor(16, 24, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');

      autoTable(doc, {
        startY: yPos,
        body: [
          ['Gross Sales', `${currency} ${fmt(data.summary?.grossSales ?? 0)}`],
          ['Discounts', `- ${currency} ${fmt(data.summary?.discounts ?? 0)}`],
          ['Refunds', `- ${currency} ${fmt(data.summary?.refunds ?? 0)}`],
          ['Net Sales', `${currency} ${fmt(data.summary?.netSales ?? 0)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 250, 251], textColor: 0 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
      });
      yPos = ((doc as any).lastAutoTable?.finalY || yPos + 30) + 10;

      // Payment Breakdown
      doc.setFontSize(12);
      doc.setTextColor(16, 24, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');

      const paymentBody = (data.paymentBreakdown || []).map(pm => [pm.method, `${currency} ${fmt(pm.amount)}`]);
      autoTable(doc, {
        startY: yPos,
        body: paymentBody.length > 0 ? paymentBody : [['No payments', '']],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
      });
      yPos = ((doc as any).lastAutoTable?.finalY || yPos + 30) + 10;

      // Cash Drawer Reconciliation
      doc.setFontSize(12);
      doc.setTextColor(16, 24, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Cash Drawer Reconciliation', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');

      autoTable(doc, {
        startY: yPos,
        body: [
          ['Opening Float', `${currency} ${fmt(displayOpeningFloat)}`],
          ['Cash Sales', `${currency} ${fmt(data.reconciliation?.cashSales ?? 0)}`],
          ['Expected Cash in Drawer', `${currency} ${fmt(expectedCash)}`],
          ['Actual Cash Counted', actualCash ? `${currency} ${fmt(parseFloat(actualCash))}` : '0.00'],
          ['Difference (Over/Short)', overShort === 0 ? '0.00' : `${overShort > 0 ? '+' : ''}${currency} ${fmt(overShort)}`]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
      });

      doc.save(`Z-Report_${preset}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export Error: ", error);
      alert("Error generating PDF: " + (error as any)?.message);
    }
  };


  if (loading) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="mb-4"><ReportsTabs /></div>
        <div className="flex items-center justify-center h-64 text-[#4a5565]">Loading report data...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-[1400px] bg-[#f8f9fc] min-h-screen">
      <div className="mb-4 print:hidden">
        <ReportsTabs />
        <ReportsDateToolbar showRanges={[]} isSingleDate={true} onExport={handleExport} />
      </div>

      <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-md overflow-hidden border border-[#e4e7ec] print:shadow-none print:border-none print:max-w-full">
        {/* Header */}
        <div className="p-8 border-b border-[#f0f2f5] bg-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#101828]">Z-Report (End of Day)</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  OPEN (Shift in progress)
                </span>
                <span className="text-[11px] font-medium text-[#667085]">Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {data.generatedAt || '--:--'}</span>
              </div>
            </div>
            <button 
              onClick={handleExport}
              className="print:hidden flex items-center gap-2 px-4 py-2 bg-white border border-[#d0d5dd] rounded-lg text-sm font-semibold text-[#344054] hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {/* Actual Cash Input - Only Frontend/Interactive */}
          <div className="bg-[#f3f6ff] p-5 rounded-xs border border-[#dce4ff] flex flex-col md:flex-row items-center gap-4 print:hidden">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-black uppercase tracking-widest mb-2">Actual Cash Counted:</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d3a8c] text-sm font-bold">{currency}</span>
                <input 
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-2 bg-white border border-gray-600 rounded-md text-xl font-black text-[#101828] focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>
            <button className="w-full md:w-auto px-10 py-3.5 bg-[#0052cc] hover:bg-[#0747a6] text-white rounded-md font-bold text-sm transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 mt-auto active:scale-95">
              <Lock className="w-4 h-4" />
              Close Shift
            </button>
          </div>
        </div>

        <div className="p-8 space-y-10">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-y-8 gap-x-12">
            <InfoBlock label="Store" value={data.shiftInfo?.storeName || 'N/A'} subValue={`ID: ${data.shiftInfo?.storeId || '---'}`} />
            <InfoBlock label="Cashier" value={data.shiftInfo?.cashier || 'Unknown'} subValue={`ID: ${data.shiftInfo?.cashierId || '---'}`} />
          </div>

          {/* Financial Summary */}
          <div>
            <SectionHeader label="Financial Summary" color="border-[var(--color-primary)]" />
            <div className="space-y-4">
              <SummaryRow label="Gross Sales" value={fmt(data.summary?.grossSales ?? 0)} currency={currency} />
              <SummaryRow label="Discounts" value={`- ${fmt(data.summary?.discounts ?? 0)}`} currency={currency} color="text-red-600" />
              <SummaryRow label="Refunds" value={`- ${fmt(data.summary?.refunds ?? 0)}`} currency={currency} color="text-red-600" />
              <div className="pt-2">
                <SummaryRow label="Net Sales" value={fmt(data.summary?.netSales ?? 0)} currency={currency} isBold />
              </div>

            </div>
          </div>

          {/* Payment Breakdown */}
          <div>
            <SectionHeader label="Payment Breakdown" color="border-orange-500" />
            <div className="space-y-4">
              {(data.paymentBreakdown || []).map(pm => (
                <SummaryRow key={pm.method} label={pm.method} value={fmt(pm.amount)} currency={currency} />
              ))}
            </div>
          </div>

          {/* Reconciliation */}
          <div className="bg-[#f8f9fc] p-6 rounded-2xl border border-gray-600 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r " />
            <h2 className="text-sm font-black text-[#101828] mb-6 uppercase tracking-widest">Cash Drawer Reconciliation</h2>
            <div className="space-y-4">
              <div className="flex items-end gap-2 group print:hidden">
                <span className="text-[13px] font-medium text-[#475467]">Opening Float</span>
                <div className="flex-1 border-b border-dotted border-[#e4e7ec] mb-1.5 group-hover:border-[#d0d5dd] transition-colors" />
                <div className="text-right flex items-center justify-end gap-1">
                  <span className="text-[9px] font-black opacity-50">{currency}</span>
                  <input 
                    type="number"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                    placeholder={fmt(baseOpeningFloat)}
                    className="w-28 text-right bg-white border border-gray-600 rounded px-2 py-1 text-sm font-black text-[#101828] focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>
              <div className="hidden print:block">
                <SummaryRow label="Opening Float" value={fmt(displayOpeningFloat)} currency={currency} />
              </div>
              <SummaryRow label="Cash Sales" value={fmt(data.reconciliation?.cashSales ?? 0)} currency={currency} />
              <div className="pt-4 border-t border-[#e4e7ec]">
                <SummaryRow label="Expected Cash in Drawer" value={fmt(expectedCash)} currency={currency} isBold large />
              </div>
              
              {actualCash && (
                <div className={`mt-6 p-4 rounded-xl flex items-center justify-between border-2 transition-all ${overShort >= 0 ? 'bg-green-50 border-green-100 shadow-sm shadow-green-100' : 'bg-red-50 border-red-100 shadow-sm shadow-red-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${overShort >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {overShort >= 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${overShort >= 0 ? 'text-green-800' : 'text-red-800'}`}>Status</p>
                      <p className={`text-sm font-black ${overShort >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {overShort === 0 ? 'PERFECTLY BALANCED' : overShort > 0 ? 'OVERAGE' : 'SHORTAGE'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${overShort >= 0 ? 'text-green-800' : 'text-red-800'}`}>Amount</p>
                    <p className={`text-lg font-black ${overShort >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {overShort >= 0 ? '+' : ''}{currency} {fmt(Math.abs(overShort))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#fcfcfd] px-8 py-8 text-center border-t border-[#f0f2f5] space-y-2">
          <p className="text-[9px] text-[#98a2b3] uppercase tracking-[0.3em] font-black">OneShop POS System</p>
          <p className="text-[10px] text-[#98a2b3]">Thank you</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-6 pb-2 border-b border-[#f2f4f7]`}>
      <div className={`w-1 h-5 rounded-full ${color.replace('border-', 'bg-')}`} />
      <h2 className="text-sm font-black text-[#101828] uppercase tracking-widest">{label}</h2>
    </div>
  );
}

function InfoBlock({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-[#98a2b3] uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-[13px] font-black text-[#101828]">{value}</p>
      {subValue && <p className="text-[10px] font-bold text-[#667085] mt-0.5">{subValue}</p>}
    </div>
  );
}

function SummaryRow({ label, value, currency, color = 'text-[#475467]', isBold = false, large = false }: { 
  label: string; value: string; currency: string; color?: string; isBold?: boolean; large?: boolean 
}) {
  return (
    <div className="flex items-end gap-2 group">
      <span className={`text-[13px] ${isBold ? 'font-black text-[#101828]' : 'font-medium text-[#475467]'}`}>{label}</span>
      <div className="flex-1 border-b border-dotted border-[#e4e7ec] mb-1.5 group-hover:border-[#d0d5dd] transition-colors" />
      <div className={`text-right ${large ? 'text-2xl' : 'text-sm'} ${isBold ? 'font-black text-[#101828]' : color} font-black`}>
        <span className="text-[9px] font-black opacity-50 mr-1.5">{currency}</span>
        {value}
      </div>
    </div>
  );
}
