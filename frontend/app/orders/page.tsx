'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Store, Globe, Search, ChevronDown,
  Package, Clock, CheckCircle, Truck, XCircle, RotateCcw,
  Eye, X, MapPin, Phone, Mail, Calendar,
} from 'lucide-react';
import api from '@/app/lib/api';
import { useFmt, useStore } from '@/app/contexts/StoreContext';

// ── Types ────────────────────────────────────────────────────────────────────

type OrderSource    = 'physical' | 'online';
type OrderStatus    = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
type PaymentStatus  = 'pending' | 'paid' | 'failed' | 'refunded';

interface OrderItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderId: string;
  source: OrderSource;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  physical: number;
  online: number;
  pending: number;
  revenue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'bg-[#fff8e1] text-[#f59e0b]', icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'bg-[#e8f5e9] text-[#12b76a]', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-[#eff4ff] text-[var(--color-primary)]', icon: Package },
  shipped:    { label: 'Shipped',    color: 'bg-[#f3e8ff] text-[#7f56d9]', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'bg-[#e8f5e9] text-[#12b76a]', icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-[#fef3f2] text-[#f04438]', icon: XCircle },
  refunded:   { label: 'Refunded',   color: 'bg-[#fef3f2] text-[#f04438]', icon: RotateCcw },
};

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  pending:  'bg-[#fff8e1] text-[#f59e0b]',
  paid:     'bg-[#e8f5e9] text-[#12b76a]',
  failed:   'bg-[#fef3f2] text-[#f04438]',
  refunded: 'bg-[#fef3f2] text-[#f04438]',
};

const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

function fmtDate(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e4e7ec] p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-[#4a5565]">{label}</p>
        <p className="text-2xl font-bold text-[#101828] mt-1">{value}</p>
        {sub && <p className="text-xs text-[#4a5565] mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────────────────────

function OrderModal({ order, onClose, onStatusChange }: {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const fmt = useFmt();
  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e7ec]">
          <div>
            <h2 className="text-lg font-semibold text-[#101828]">{order.orderId}</h2>
            <p className="text-sm text-[#4a5565]">{fmtDate(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f9fafb] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#4a5565]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Source + Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              order.source === 'physical' ? 'bg-[#eff4ff] text-[var(--color-primary)]' : 'bg-[#f3e8ff] text-[#7f56d9]'
            }`}>
              {order.source === 'physical' ? <Store className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {order.source === 'physical' ? 'Physical Store' : 'Online'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLOR[order.paymentStatus]}`}>
              {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)} · {order.paymentMethod}
            </span>
          </div>

          {/* Customer */}
          <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#101828]">Customer</h3>
            <p className="text-sm font-medium text-[#101828]">{order.customerName}</p>
            {order.customerEmail && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> {order.customerEmail}
              </p>
            )}
            {order.customerPhone && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
              </p>
            )}
            {order.deliveryAddress && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> {order.deliveryAddress}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-[#101828] mb-3">Items</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#f2f4f7] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#101828]">{item.productName}</p>
                    <p className="text-xs text-[#4a5565]">{item.sku} · {fmt(item.unitPrice)} each</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#101828]">{fmt(item.subtotal)}</p>
                    <p className="text-xs text-[#4a5565]">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-[#4a5565]">
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-[#12b76a]">
                <span>Discount</span><span>−{fmt(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#101828] pt-2 border-t border-[#e4e7ec]">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
          </div>

          {/* Update Status — manager action */}
          {!['delivered', 'cancelled', 'refunded'].includes(order.status) && (
            <div>
              <h3 className="text-sm font-semibold text-[#101828] mb-2">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.filter(s => s !== order.status && !['refunded'].includes(s)).map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(order._id, s)}
                    className="px-3 py-1.5 text-xs font-medium border border-[#e4e7ec] rounded-lg hover:bg-[#f9fafb] text-[#4a5565] transition-colors"
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div>
              <h3 className="text-sm font-semibold text-[#101828] mb-1">Notes</h3>
              <p className="text-sm text-[#4a5565]">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const fmt = useFmt();
  const { currencyLocale } = useStore();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sourceFilter, setSource] = useState<'all' | OrderSource>('all');
  const [statusFilter, setStatus] = useState('all');
  const [selected, setSelected]   = useState<Order | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 20;

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/orders/stats');
      setStats(res.data.data);
    } catch { /* silent */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim())          params.search = search.trim();

      const res = await api.get('/orders', { params });
      setOrders(res.data.data);
      setTotal(res.data.total);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, statusFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status } : null);
      fetchStats();
    } catch { /* silent */ }
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
         
          <p className="text-sm text-[#4a5565]">All physical store and online purchases</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Orders"    value={stats.total}    icon={ShoppingBag}   color="bg-[#eff4ff] text-[var(--color-primary)]" />
          <StatCard label="Physical"        value={stats.physical} icon={Store}         color="bg-[#e8f5e9] text-[#12b76a]" sub="In-store" />
          <StatCard label="Online"          value={stats.online}   icon={Globe}         color="bg-[#f3e8ff] text-[#7f56d9]" sub="Website" />
          <StatCard label="Pending"         value={stats.pending}  icon={Clock}         color="bg-[#fff8e1] text-[#f59e0b]" sub="Needs attention" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#e4e7ec] rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98a2b3]" />
          <input
            type="text"
            placeholder="Search customer name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#e4e7ec] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Source filter */}
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={e => { setSource(e.target.value as 'all' | OrderSource); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#e4e7ec] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[#101828]"
          >
            <option value="all">All Sources</option>
            <option value="physical">Physical Store</option>
            <option value="online">Online</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98a2b3] pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#e4e7ec] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[#101828]"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98a2b3] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e4e7ec] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Order ID', 'Source', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f7]">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#4a5565]">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#4a5565]">No orders found</td></tr>
              ) : orders.map(order => {
                const cfg = STATUS_CONFIG[order.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={order._id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-primary)] font-medium whitespace-nowrap">
                      {order.orderId}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.source === 'physical' ? 'bg-[#eff4ff] text-[var(--color-primary)]' : 'bg-[#f3e8ff] text-[#7f56d9]'
                      }`}>
                        {order.source === 'physical' ? <Store className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {order.source === 'physical' ? 'Physical' : 'Online'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#101828]">{order.customerName}</p>
                      {order.customerEmail && <p className="text-xs text-[#4a5565]">{order.customerEmail}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#4a5565]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 font-semibold text-[#101828] whitespace-nowrap">{fmt(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLOR[order.paymentStatus]}`}>
                        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4a5565] whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString(currencyLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(order)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[var(--color-primary)] hover:bg-[#eff4ff] rounded-lg transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e4e7ec] text-sm text-[#4a5565]">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-[#e4e7ec] rounded-lg disabled:opacity-40 hover:bg-[#f9fafb] transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-[#e4e7ec] rounded-lg disabled:opacity-40 hover:bg-[#f9fafb] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
