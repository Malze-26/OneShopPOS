'use client';

import { useState } from 'react';
import { Search, Calendar, Download } from 'lucide-react';

const transactionsData = [
  { id: 'TXN-001', orderId: 'ORD-001', customer: 'Customer 001', payment: 'Cash', amount: 12500, date: '2026-02-20 10:30 AM', status: 'success' },
  { id: 'TXN-002', orderId: 'ORD-002', customer: 'Customer 002', payment: 'Card', amount: 8300, date: '2026-02-20 10:15 AM', status: 'success' },
  { id: 'TXN-003', orderId: 'ORD-003', customer: 'Customer 003', payment: 'Bank Transfer', amount: 15750, date: '2026-02-20 09:45 AM', status: 'success' },
  { id: 'TXN-004', orderId: 'ORD-005', customer: 'Customer 005', payment: 'Cash', amount: 9800, date: '2026-02-20 08:50 AM', status: 'success' },
  { id: 'TXN-005', orderId: 'ORD-007', customer: 'Customer 007', payment: 'Bank Transfer', amount: 18900, date: '2026-02-19 04:15 PM', status: 'success' },
  { id: 'TXN-006', orderId: 'ORD-009', customer: 'Customer 009', payment: 'Card', amount: 7650, date: '2026-02-19 02:30 PM', status: 'success' },
  { id: 'TXN-007', orderId: 'ORD-011', customer: 'Customer 011', payment: 'Cash', amount: 14200, date: '2026-02-19 11:45 AM', status: 'success' },
  { id: 'TXN-008', orderId: 'ORD-013', customer: 'Customer 013', payment: 'Bank Transfer', amount: 11300, date: '2026-02-18 05:20 PM', status: 'success' },
];

const paymentConfig: Record<string, { bg: string; text: string }> = {
  Cash: { bg: '#ecfdf3', text: '#12b76a' },
  Card: { bg: '#eff4ff', text: '#155dfc' },
  'Bank Transfer': { bg: '#fffaeb', text: '#f79009' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  success: { label: 'Success', bg: '#ecfdf3', text: '#12b76a' },
  pending: { label: 'Pending', bg: '#fffaeb', text: '#f79009' },
  failed: { label: 'Failed', bg: '#fef3f2', text: '#f04438' },
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = transactionsData.filter((t) => {
    const matchesFilter = filter === 'All' || t.payment === filter;
    const matchesSearch = !search || t.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCash = transactionsData.filter((t) => t.payment === 'Cash').reduce((s, t) => s + t.amount, 0);
  const totalCard = transactionsData.filter((t) => t.payment === 'Card').reduce((s, t) => s + t.amount, 0);
  const totalBank = transactionsData.filter((t) => t.payment === 'Bank Transfer').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Transactions</h1>
        <p className="text-sm text-[#4a5565]">View all payment transactions</p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] border-l-4 border-l-[#12b76a]">
          <p className="text-xs text-[#4a5565] mb-1">Cash Transactions</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR {totalCash.toLocaleString()}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] border-l-4 border-l-[#155dfc]">
          <p className="text-xs text-[#4a5565] mb-1">Card Transactions</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR {totalCard.toLocaleString()}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] border-l-4 border-l-[#f79009]">
          <p className="text-xs text-[#4a5565] mb-1">Bank Transfer</p>
          <h3 className="text-2xl font-bold text-[#101828]">LKR {totalBank.toLocaleString()}</h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2">
            {['All', 'Cash', 'Card', 'Bank Transfer'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#155dfc] text-white'
                    : 'border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction ID..."
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white hover:bg-[#f9fafb] transition-colors">
            <Calendar className="w-4 h-4" />
            Date Range
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">All Transactions</h2>
          <p className="text-xs text-[#4a5565] mt-1">Showing {filtered.length} transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Transaction ID', 'Order ID', 'Customer', 'Payment Method', 'Amount (LKR)', 'Date & Time', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-[#155dfc]">{t.id}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-[#101828]">{t.orderId}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#101828]">{t.customer}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: paymentConfig[t.payment]?.bg, color: paymentConfig[t.payment]?.text }}
                    >
                      {t.payment}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-[#101828]">{t.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#4a5565]">{t.date}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: statusConfig[t.status]?.bg, color: statusConfig[t.status]?.text }}
                    >
                      {statusConfig[t.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-[#e4e7ec] flex items-center justify-between">
          <p className="text-sm text-[#4a5565]">Showing 1 to {filtered.length} of 324 transactions</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors">
              Previous
            </button>
            <button className="px-3 py-1.5 bg-[#155dfc] text-white hover:bg-[#0d4dd9] rounded-lg text-sm font-medium transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
