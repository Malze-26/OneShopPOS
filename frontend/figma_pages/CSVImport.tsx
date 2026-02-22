import { useState } from 'react';
import { CloudUpload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const steps = [
  { number: 1, label: 'Download Template' },
  { number: 2, label: 'Upload File' },
  { number: 3, label: 'Review' },
  { number: 4, label: 'Import' },
];

const samplePreviewData = [
  { row: 1, name: 'Product 001', sku: 'SKU-001', category: 'Category A', price: 1250, stock: 100, status: 'valid' },
  { row: 2, name: 'Product 002', sku: 'SKU-002', category: 'Category B', price: 2450, stock: 50, status: 'valid' },
  { row: 3, name: '', sku: 'SKU-003', category: 'Category A', price: 0, stock: 0, status: 'error', errors: ['Product name is required', 'Price must be greater than 0'] },
  { row: 4, name: 'Product 004', sku: 'SKU-004', category: 'Category C', price: 3200, stock: 75, status: 'valid' },
  { row: 5, name: 'Product 005', sku: '', category: 'Category B', price: 1680, stock: 0, status: 'error', errors: ['SKU is required'] },
];

export function CSVImport() {
  const [currentStep, setCurrentStep] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Step Indicator */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                    currentStep >= step.number
                      ? 'bg-[#155dfc] text-white'
                      : 'bg-[#f9fafb] text-[#4a5565] border-2 border-[#e4e7ec]'
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs font-medium ${
                    currentStep >= step.number ? 'text-[#101828]' : 'text-[#4a5565]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 -mt-8 ${
                    currentStep > step.number ? 'bg-[#155dfc]' : 'bg-[#e4e7ec]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Download Template Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#101828] mb-2">
              Step 1: Download CSV Template
            </h2>
            <p className="text-sm text-[#4a5565] mb-4">
              Download our CSV template to ensure your data is formatted correctly. Fill in your product information following the template structure.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <h2 className="text-base font-semibold text-[#101828] mb-4">
          Step 2: Upload Your CSV File
        </h2>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#155dfc] bg-[#eff4ff]'
              : 'border-[#e4e7ec] hover:border-[#155dfc] hover:bg-[#eff4ff]/30'
          }`}
        >
          <CloudUpload className="w-16 h-16 text-[#155dfc] mx-auto mb-4" />
          <h3 className="text-base font-semibold text-[#101828] mb-2">
            Drag & drop your CSV file here
          </h3>
          <p className="text-sm text-[#4a5565] mb-4">or</p>
          <button className="px-6 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors">
            Browse Files
          </button>
          <p className="text-xs text-[#4a5565] mt-4">Maximum file size: 10MB</p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">Step 3: Review Imported Data</h2>
          <p className="text-xs text-[#4a5565] mt-1">
            Verify your data before importing. Rows with errors are highlighted.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Row
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Price (LKR)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#4a5565] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {samplePreviewData.map((row) => (
                <tr
                  key={row.row}
                  className={`${
                    row.status === 'error'
                      ? 'bg-[#fef3f2]'
                      : 'hover:bg-[#f9fafb]'
                  } transition-colors`}
                >
                  <td className="px-6 py-4 text-sm text-[#4a5565]">{row.row}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#101828]">{row.name || '-'}</div>
                    {row.status === 'error' && row.errors?.includes('Product name is required') && (
                      <div className="text-xs text-[#f04438] mt-1">Required field</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#101828]">{row.sku || '-'}</div>
                    {row.status === 'error' && row.errors?.includes('SKU is required') && (
                      <div className="text-xs text-[#f04438] mt-1">Required field</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#101828]">{row.category}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#101828]">{row.price}</div>
                    {row.status === 'error' && row.errors?.includes('Price must be greater than 0') && (
                      <div className="text-xs text-[#f04438] mt-1">Invalid value</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#101828]">{row.stock}</td>
                  <td className="px-6 py-4">
                    {row.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ecfdf3] text-[#12b76a] rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#fef3f2] text-[#f04438] rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary & Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary Box */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h3 className="text-base font-semibold text-[#101828] mb-4">Import Summary</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#ecfdf3] rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#12b76a]" />
                <span className="text-sm font-medium text-[#101828]">Valid Rows</span>
              </div>
              <span className="text-lg font-bold text-[#12b76a]">3</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#fef3f2] rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-[#f04438]" />
                <span className="text-sm font-medium text-[#101828]">Rows with Errors</span>
              </div>
              <span className="text-lg font-bold text-[#f04438]">2</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
              <span className="text-sm font-medium text-[#101828]">Total Rows</span>
              <span className="text-lg font-bold text-[#101828]">5</span>
            </div>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h3 className="text-base font-semibold text-[#101828] mb-4">Error Details</h3>
          
          <div className="space-y-3">
            <div className="p-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-[#f04438] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#101828]">Row 3 Errors:</p>
                  <ul className="text-xs text-[#4a5565] mt-1 space-y-1 list-disc list-inside">
                    <li>Product name is required</li>
                    <li>Price must be greater than 0</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-[#f04438] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#101828]">Row 5 Errors:</p>
                  <ul className="text-xs text-[#4a5565] mt-1 space-y-1 list-disc list-inside">
                    <li>SKU is required</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Button */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button className="px-6 py-2.5 text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors">
          Cancel
        </button>
        <button
          onClick={() => setShowResults(true)}
          className="px-6 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          Import Valid Products (3)
        </button>
      </div>

      {/* Success Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#ecfdf3] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#12b76a]" />
              </div>
              <h3 className="text-lg font-semibold text-[#101828] mb-2">Import Completed!</h3>
              <p className="text-sm text-[#4a5565]">
                3 products have been successfully imported to your inventory.
              </p>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#4a5565]">Successfully imported:</span>
                <span className="font-semibold text-[#12b76a]">3 products</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4a5565]">Failed:</span>
                <span className="font-semibold text-[#f04438]">2 rows</span>
              </div>
            </div>

            <button
              onClick={() => setShowResults(false)}
              className="w-full px-6 py-2.5 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
