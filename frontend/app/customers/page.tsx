'use client';

import { useState, useEffect } from 'react';
import {
  Search, Eye, X, Mail, Phone, MapPin,
  ShoppingBag, Store, Globe, Clock, CheckCircle,
  Package, Truck, XCircle, RotateCcw, DollarSign,
} from 'lucide-react';
import api from '@/app/lib/api';
import { useFmt, useStore } from '@/app/contexts/StoreContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase?: string;
  createdAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  avgLifetimeValue: number;
}

type SortKey = 'recent' | 'spent_high' | 'spent_low' | 'orders';

type OrderStatus   = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

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
  source: 'physical' | 'online';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  deliveryAddress?: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'bg-[#fff8e1] text-[#f59e0b]', icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'bg-[#e8f5e9] text-[#12b76a]', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-[#eff4ff] text-[var(--color-primary)]', icon: Package },
  shipped:    { label: 'Shipped',    color: 'bg-[#f3e8ff] text-[#7f56d9]', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'bg-[#e8f5e9] text-[#12b76a]', icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'bg-[#fef3f2] text-[#f04438]', icon: XCircle },
  refunded:   { label: 'Refunded',   color: 'bg-[#fef3f2] text-[#f04438]', icon: RotateCcw },
};

const PAYMENT_COLOR: Record<PaymentStatus, string> = {
  pending:  'bg-[#fff8e1] text-[#f59e0b]',
  paid:     'bg-[#e8f5e9] text-[#12b76a]',
  failed:   'bg-[#fef3f2] text-[#f04438]',
  refunded: 'bg-[#fef3f2] text-[#f04438]',
};

// ── Customer Detail Panel ─────────────────────────────────────────────────────

function CustomerPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const fmt = useFmt();
  const { currency } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/${customer._id}/orders`)
      .then(res => setOrders(res.data.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [customer._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-white shadow-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e7ec]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#eff4ff] rounded-full flex items-center justify-center">
              <span className="text-base font-semibold text-[var(--color-primary)]">{customer.avatar}</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#101828]">{customer.name}</h2>
              <p className="text-xs text-[#4a5565]">Customer since {fmtDate(customer.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f9fafb] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#4a5565]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact info */}
          <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#101828] mb-2">Contact</h3>
            {customer.email && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#98a2b3]" /> {customer.email}
              </p>
            )}
            {customer.phone && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#98a2b3]" /> {customer.phone}
              </p>
            )}
            {customer.address && (
              <p className="text-sm text-[#4a5565] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#98a2b3]" /> {customer.address}
              </p>
            )}
            {!customer.email && !customer.phone && !customer.address && (
              <p className="text-sm text-[#98a2b3]">No contact details</p>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#eff4ff] rounded-xl p-3 text-center">
              <ShoppingBag className="w-4 h-4 text-[var(--color-primary)] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#101828]">{customer.totalOrders}</p>
              <p className="text-xs text-[#4a5565]">Orders</p>
            </div>
            <div className="bg-[#e8f5e9] rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-[#12b76a] mx-auto mb-1" />
              <p className="text-sm font-bold text-[#101828]">{fmt(customer.totalSpent)}</p>
              <p className="text-xs text-[#4a5565]">Spent</p>
            </div>
            <div className="bg-[#fff8e1] rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-[#f59e0b] mx-auto mb-1" />
              <p className="text-xs font-semibold text-[#101828]">{fmtDate(customer.lastPurchase)}</p>
              <p className="text-xs text-[#4a5565]">Last buy</p>
            </div>
          </div>

          {/* Order history */}
          <div>
            <h3 className="text-sm font-semibold text-[#101828] mb-3">
              Order History {!loading && `(${orders.length})`}
            </h3>

            {loading ? (
              <p className="text-sm text-[#4a5565] text-center py-6">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-[#98a2b3] text-center py-6">No orders found</p>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={order._id} className="border border-[#e4e7ec] rounded-xl p-4 space-y-2">
                      {/* Order header */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">{order.orderId}</span>
                        <span className="text-xs text-[#4a5565]">{fmtDate(order.createdAt)}</span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.source === 'physical' ? 'bg-[#eff4ff] text-[var(--color-primary)]' : 'bg-[#f3e8ff] text-[#7f56d9]'
                        }`}>
                          {order.source === 'physical' ? <Store className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          {order.source === 'physical' ? 'Physical' : 'Online'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLOR[order.paymentStatus]}`}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)} · {order.paymentMethod}
                        </span>
                      </div>

                      {/* Items summary */}
                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-[#4a5565]">
                            <span>{item.productName} <span className="text-[#98a2b3]">×{item.quantity}</span></span>
                            <span>{fmt(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between text-sm font-bold text-[#101828] pt-1 border-t border-[#f2f4f7]">
                        <span>Total</span>
                        <span>{fmt(order.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { currency } = useStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats]         = useState<CustomerStats | null>(null);
  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState<SortKey>('recent');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState<Customer | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = { sort };
        if (search.trim()) params.search = search.trim();

        const [customersRes, statsRes] = await Promise.allSettled([
          api.get('/customers', { params }),
          api.get('/customers/stats'),
        ]);

        if (customersRes.status === 'fulfilled') {
          setCustomers(customersRes.value.data.data);
          setError('');
        } else {
          setError('Failed to load customers.');
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, sort]);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="mb-6">
      
        <p className="text-sm text-[#4a5565]">View customer info and their order history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">Total Customers</p>
          <h3 className="text-2xl font-bold text-[#101828]">{stats ? stats.totalCustomers.toLocaleString() : '—'}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">New This Month</p>
          <h3 className="text-2xl font-bold text-[#101828]">{stats ? stats.newThisMonth.toLocaleString() : '—'}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <p className="text-xs text-[#4a5565] mb-1">Average Lifetime Value</p>
          <h3 className="text-2xl font-bold text-[#101828]">{stats ? `${currency} ${stats.avgLifetimeValue.toLocaleString()}` : '—'}</h3>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="recent">Sort: Recent</option>
            <option value="spent_high">Sort: Spent (High → Low)</option>
            <option value="spent_low">Sort: Spent (Low → High)</option>
            <option value="orders">Sort: Total Orders</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">All Customers</h2>
          <p className="text-xs text-[#4a5565] mt-1">
            {loading ? 'Loading...' : `Showing ${customers.length} customers`}
          </p>
        </div>

        {error && (
          <div className="px-5 py-4 text-sm text-red-600 bg-red-50 border-b border-[#e4e7ec]">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
              <tr>
                {['Customer', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Purchase', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#4a5565]">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#4a5565]">No customers found.</td>
                </tr>
              ) : customers.map(customer => (
                <tr key={customer._id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#eff4ff] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--color-primary)]">{customer.avatar}</span>
                      </div>
                      <div className="text-sm font-medium text-[#101828]">{customer.name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.email ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{customer.phone ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-medium text-[#101828]">{customer.totalOrders}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#101828]">{currency} {customer.totalSpent.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm text-[#4a5565]">{fmtDate(customer.lastPurchase)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setSelected(customer)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[var(--color-primary)] hover:bg-[#eff4ff] rounded-lg transition-colors text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[#e4e7ec]">
          <p className="text-sm text-[#4a5565]">
            Showing {customers.length} of {stats?.totalCustomers ?? customers.length} customers
          </p>
        </div>
      </div>

      {/* Customer detail panel */}
      {selected && (
        <CustomerPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
