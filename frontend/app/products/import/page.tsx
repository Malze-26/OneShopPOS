'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload, Download, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedRow {
  row: number;
  name: string;
  sku: string;
  category: string;
  selling_price: number;
  cost_price: number;
  stock: number;
  low_stock_threshold: number;
  errors: string[];
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
}

type Phase = 'upload' | 'preview' | 'importing' | 'done';

// ── CSV helpers ────────────────────────────────────────────────────────────────

const TEMPLATE_CSV = [
  'name,sku,category,selling_price,cost_price,stock,low_stock_threshold',
  'Coca-Cola 500ml,BEV-001,Beverages,180,130,100,20',
  "Lay's Classic Chips 100g,SNK-001,Snacks,250,180,60,15",
  'Anchor Butter 200g,DAI-001,Dairy,490,380,25,10',
].join('\n');

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).map((line, i) => {
    // Handle quoted fields (basic CSV parsing)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const get = (key: string) => values[headers.indexOf(key)] ?? '';

    const name = get('name');
    const sku = get('sku');
    const category = get('category') || 'Uncategorized';
    const selling_price = parseFloat(get('selling_price')) || 0;
    const cost_price = parseFloat(get('cost_price')) || 0;
    const stock = parseInt(get('stock')) || 0;
    const low_stock_threshold = parseInt(get('low_stock_threshold')) || 10;

    const errors: string[] = [];
    if (!name) errors.push('Product name is required');
    if (!sku) errors.push('SKU is required');
    if (!selling_price || selling_price <= 0) errors.push('Selling price must be greater than 0');

    return { row: i + 1, name, sku, category, selling_price, cost_price, stock, low_stock_threshold, errors };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

const STEPS = ['Download Template', 'Upload File', 'Review', 'Import'];

export default function CSVImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const currentStep = phase === 'upload' ? 2 : phase === 'preview' ? 3 : 4;

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file (.csv)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        alert('The file appears to be empty or has no data rows.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setPhase('preview');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) return;

    setPhase('importing');
    try {
      const res = await api.post('/products/bulk/import-csv', { rows: validRows });
      setImportResult(res.data);
      setPhase('done');
    } catch {
      setPhase('preview');
      alert('Import failed. Please check your connection and try again.');
    }
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const errorRows = rows.filter((r) => r.errors.length > 0);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Import Products</h1>
        <p className="text-sm text-[#4a5565]">Bulk import products using a CSV file</p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex items-center">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = currentStep >= num;
            const connected = currentStep > num;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                      active ? 'bg-[#155dfc] text-white' : 'bg-[#f9fafb] text-[#4a5565] border-2 border-[#e4e7ec]'
                    }`}
                  >
                    {num}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-[#101828]' : 'text-[#4a5565]'}`}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-6 ${connected ? 'bg-[#155dfc]' : 'bg-[#e4e7ec]'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1 – Download Template */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#101828] mb-2">Step 1: Download CSV Template</h2>
            <p className="text-sm text-[#4a5565]">
              Download our template and fill in your product data. Required columns:{' '}
              <span className="font-mono text-xs bg-[#f9fafb] px-1 rounded">name</span>,{' '}
              <span className="font-mono text-xs bg-[#f9fafb] px-1 rounded">sku</span>,{' '}
              <span className="font-mono text-xs bg-[#f9fafb] px-1 rounded">selling_price</span>. All other columns are optional.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Step 2 – Upload */}
      {(phase === 'upload' || phase === 'preview') && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
          <h2 className="text-base font-semibold text-[#101828] mb-4">
            Step 2: Upload Your CSV File
            {fileName && (
              <span className="text-sm font-normal text-[#4a5565] ml-2">— {fileName}</span>
            )}
          </h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#155dfc] bg-[#eff4ff]'
                : 'border-[#e4e7ec] hover:border-[#155dfc] hover:bg-[#eff4ff]/30'
            }`}
          >
            <CloudUpload className="w-14 h-14 text-[#155dfc] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#101828] mb-2">
              {phase === 'preview' ? 'Drop another file to replace' : 'Drag & drop your CSV file here'}
            </h3>
            <p className="text-sm text-[#4a5565] mb-4">or</p>
            <span className="px-6 py-2.5 bg-[#155dfc] text-white rounded-lg text-sm font-medium">
              Browse Files
            </span>
            <p className="text-xs text-[#4a5565] mt-4">CSV files only · Max 10 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Step 3 – Preview */}
      {phase === 'preview' && rows.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828]">Step 3: Review Data</h2>
              <p className="text-xs text-[#4a5565] mt-1">
                Rows highlighted in red have errors and will be skipped during import.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                  <tr>
                    {['Row', 'Product Name', 'SKU', 'Category', 'Price (LKR)', 'Stock', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e7ec]">
                  {rows.map((row) => {
                    const hasError = row.errors.length > 0;
                    return (
                      <tr
                        key={row.row}
                        className={`transition-colors ${hasError ? 'bg-[#fef3f2]' : 'hover:bg-[#f9fafb]'}`}
                      >
                        <td className="px-6 py-3 text-sm text-[#4a5565]">{row.row}</td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-[#101828]">{row.name || '—'}</div>
                          {row.errors.includes('Product name is required') && (
                            <div className="text-xs text-[#f04438] mt-0.5">Required</div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm font-mono text-[#101828]">{row.sku || '—'}</div>
                          {row.errors.includes('SKU is required') && (
                            <div className="text-xs text-[#f04438] mt-0.5">Required</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-[#101828]">{row.category}</td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-[#101828]">
                            {row.selling_price > 0 ? row.selling_price.toLocaleString() : '—'}
                          </div>
                          {row.errors.includes('Selling price must be greater than 0') && (
                            <div className="text-xs text-[#f04438] mt-0.5">Invalid</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-[#101828]">{row.stock}</td>
                        <td className="px-6 py-3">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#fef3f2] text-[#f04438] rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ecfdf3] text-[#12b76a] rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary + Error Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h3 className="text-base font-semibold text-[#101828] mb-4">Import Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#ecfdf3] rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#12b76a]" />
                    <span className="text-sm font-medium text-[#101828]">Valid Rows</span>
                  </div>
                  <span className="text-lg font-bold text-[#12b76a]">{validCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#fef3f2] rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-[#f04438]" />
                    <span className="text-sm font-medium text-[#101828]">Rows with Errors</span>
                  </div>
                  <span className="text-lg font-bold text-[#f04438]">{errorCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
                  <span className="text-sm font-medium text-[#101828]">Total Rows</span>
                  <span className="text-lg font-bold text-[#101828]">{rows.length}</span>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {errorRows.length > 0 ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
                <h3 className="text-base font-semibold text-[#101828] mb-4">Error Details</h3>
                <div className="space-y-3 max-h-52 overflow-y-auto">
                  {errorRows.map((row) => (
                    <div
                      key={row.row}
                      className="p-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[#f04438] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[#101828]">Row {row.row}:</p>
                          <ul className="text-xs text-[#4a5565] mt-1 space-y-0.5 list-disc list-inside">
                            {row.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-[#12b76a] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#101828]">All rows are valid!</p>
                  <p className="text-xs text-[#4a5565] mt-1">Ready to import.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-2.5 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0}
              className="px-6 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {validCount} Valid Product{validCount !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}

      {/* Importing spinner */}
      {phase === 'importing' && (
        <div className="bg-white rounded-xl p-16 shadow-sm border border-[#e4e7ec] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#155dfc] animate-spin" />
          <span className="ml-3 text-[#4a5565]">Importing products…</span>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && importResult && (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-[#e4e7ec] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-[#ecfdf3] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#12b76a]" />
          </div>
          <h3 className="text-lg font-semibold text-[#101828] mb-2">Import Completed!</h3>
          <p className="text-sm text-[#4a5565] mb-6">
            {importResult.imported} product{importResult.imported !== 1 ? 's' : ''} successfully added to your inventory.
          </p>

          <div className="flex justify-center gap-10 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#12b76a]">{importResult.imported}</div>
              <div className="text-sm text-[#4a5565]">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#f04438]">{importResult.failed}</div>
              <div className="text-sm text-[#4a5565]">Failed</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="text-left mb-6">
              <h4 className="text-sm font-semibold text-[#101828] mb-3">Failed rows:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg text-sm text-left"
                  >
                    <span className="font-medium text-[#101828]">Row {e.row}: </span>
                    <span className="text-[#4a5565]">{e.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/products')}
            className="w-full px-6 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Products
          </button>
        </div>
      )}
    </div>
  );
}
