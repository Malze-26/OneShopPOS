'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Package, PackageX, TrendingDown, UserX, ChevronRight, CalendarClock } from 'lucide-react';
import api from '@/app/lib/api';
import { useFmt } from '@/app/contexts/StoreContext';
import { formatStoreDate } from '@/app/lib/timezone';

interface LowStockAlert {
  _id: string; name: string; sku: string; stock: number; lowStockThreshold: number; category: string;
}
interface OutOfStockAlert {
  _id: string; name: string; sku: string; stock: number; lowStockThreshold: number; category: string;
}
interface NoSalesAlert {
  id: string; product: string; sku: string; lastSale: string | null; daysAgo: number;
}
interface ExpiryAlert {
  id: string; product: string; sku: string; category: string; stock: number;
  expiryDate: string; daysLeft: number; status: 'expired' | 'expiring-soon'; atRiskValue: number;
}
interface InactiveStaff {
  id: string; name: string; role: string; lastLogin: string; daysInactive: number;
}
// Mirrors EXPIRY_SOON_DAYS in backend/src/constants — the /alerts/expiry window.
const EXPIRY_SOON_DAYS = 7;

function expiryLabel(daysLeft: number) {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return 'Expires today';
  return `${daysLeft}d left`;
}

function formatExpiryDate(value: string) {
  return formatStoreDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function StatCard({
  id, icon: Icon, label, value, sub, accent,
}: {
  id: string; icon: typeof AlertTriangle; label: string; value: number; sub?: string; accent: string;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToSection(id)}
      className="text-left bg-white rounded-xl p-4 shadow-sm border-l-4 border border-[#e4e7ec] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        <p className="text-xs text-[#4a5565] font-semibold">{label}</p>
      </div>
      <h3 className="text-2xl font-bold" style={{ color: accent }}>{value}</h3>
      {sub && <p className="text-xs text-[#4a5565] mt-1">{sub}</p>}
    </button>
  );
}

export default function AlertsPage() {
  const fmt = useFmt();
  const [lowStock, setLowStock]         = useState<LowStockAlert[]>([]);
  const [outOfStock, setOutOfStock]     = useState<OutOfStockAlert[]>([]);
  const [expiring, setExpiring]         = useState<ExpiryAlert[]>([]);
  const [noSales, setNoSales]           = useState<NoSalesAlert[]>([]);
  const [inactiveStaff, setInactiveStaff] = useState<InactiveStaff[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: LowStockAlert[] }>('/alerts/low-stock').then(r => setLowStock(r.data.data)).catch(() => {}),
      api.get<{ data: OutOfStockAlert[] }>('/alerts/out-of-stock').then(r => setOutOfStock(r.data.data)).catch(() => {}),
      api.get<{ data: ExpiryAlert[] }>('/alerts/expiry').then(r => setExpiring(r.data.data)).catch(() => {}),
      api.get<{ data: NoSalesAlert[] }>('/alerts/no-sales').then(r => setNoSales(r.data.data)).catch(() => {}),
      api.get<{ data: InactiveStaff[] }>('/alerts/inactive-staff').then(r => setInactiveStaff(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const totalAtRisk = expiring.reduce((sum, item) => sum + item.atRiskValue, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#4a5565]">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <p className="text-sm text-[#4a5565]">Monitor important notifications and warnings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard id="out-of-stock-section" icon={PackageX} label="Out of Stock" value={outOfStock.length} accent="#f04438" />
        <StatCard id="low-stock-section" icon={AlertTriangle} label="Low Stock" value={lowStock.length} accent="#f04438" />
        <StatCard
          id="expiring-section"
          icon={CalendarClock}
          label="Expiring Soon"
          value={expiring.length}
          sub={`${fmt(totalAtRisk)} at risk`}
          accent="#f79009"
        />
        <StatCard id="no-sales-section" icon={TrendingDown} label="No Sales" value={noSales.length} accent="#f79009" />
        <StatCard id="inactive-staff-section" icon={UserX} label="Inactive Employees" value={inactiveStaff.length} accent="#f79009" />
      </div>

      <div className="space-y-6">
        {/* Out of Stock */}
        <div id="out-of-stock-section" className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec] overflow-hidden scroll-mt-6">
          <div className="px-5 py-4 bg-[#fef3f2] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageX className="w-5 h-5 text-[#f04438]" />
              <h2 className="text-base font-semibold text-[#101828]">Out of Stock Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f04438] text-white text-xs font-medium rounded-full">
                {outOfStock.length}
              </span>
            </div>
            <Link href="/stocks" className="text-sm text-[var(--color-primary)] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {outOfStock.length === 0 ? (
              <p className="text-sm text-[#4a5565] text-center py-4">No out of stock items</p>
            ) : (
              outOfStock.map((item) => (
                <div key={item._id} className="p-4 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PackageX className="w-4 h-4 text-[#f04438]" />
                      <div className="text-sm font-medium text-[#101828]">{item.name}</div>
                      <span className="text-xs text-[#4a5565]">({item.sku})</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#4a5565]">
                        Current: <span className="font-semibold text-[#f04438]">{item.stock}</span>
                      </span>
                      <span className="text-[#4a5565]">
                        Threshold: <span className="font-semibold text-[#101828]">{item.lowStockThreshold}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-[#f9fafb] text-[#4a5565] rounded text-xs">{item.category}</span>
                    </div>
                  </div>
                  <Link
                    href="/stocks"
                    className="ml-4 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Restock
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div id="low-stock-section" className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec] overflow-hidden scroll-mt-6">
          <div className="px-5 py-4 bg-[#fef3f2] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#f04438]" />
              <h2 className="text-base font-semibold text-[#101828]">Low Stock Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f04438] text-white text-xs font-medium rounded-full">
                {lowStock.length}
              </span>
            </div>
            <Link href="/stocks" className="text-sm text-[var(--color-primary)] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-[#4a5565] text-center py-4">No low stock items</p>
            ) : (
              lowStock.map((item) => (
                <div key={item._id} className="p-4 bg-[#fffaeb] border border-[#f79009]/20 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-[#f79009]" />
                      <div className="text-sm font-medium text-[#101828]">{item.name}</div>
                      <span className="text-xs text-[#4a5565]">({item.sku})</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#4a5565]">
                        Current: <span className="font-semibold text-[#f04438]">{item.stock}</span>
                      </span>
                      <span className="text-[#4a5565]">
                        Threshold: <span className="font-semibold text-[#101828]">{item.lowStockThreshold}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-[#f9fafb] text-[#4a5565] rounded text-xs">{item.category}</span>
                    </div>
                  </div>
                  <Link
                    href="/stocks"
                    className="ml-4 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Adjust Stock
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiring Soon */}
        <div id="expiring-section" className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec] overflow-hidden scroll-mt-6">
          <div className="px-5 py-4 bg-[#fffaeb] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#f79009]" />
              <h2 className="text-base font-semibold text-[#101828]">Expiring Soon</h2>
              <span className="px-2 py-0.5 bg-[#f79009] text-white text-xs font-medium rounded-full">
                {expiring.length}
              </span>
            </div>
            <Link href="/stocks" className="text-sm text-[var(--color-primary)] hover:underline font-medium">
              View All Stock
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {expiring.length === 0 ? (
              <p className="text-sm text-[#4a5565] text-center py-4">
                Nothing expiring in the next {EXPIRY_SOON_DAYS} days
              </p>
            ) : (
              expiring.map((item) => {
                const expired = item.status === 'expired';
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border flex items-center justify-between ${
                      expired ? 'bg-[#fef3f2] border-[#f04438]/20' : 'bg-[#fffaeb] border-[#f79009]/20'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`w-4 h-4 ${expired ? 'text-[#f04438]' : 'text-[#f79009]'}`} />
                        <div className="text-sm font-medium text-[#101828]">{item.product}</div>
                        <span className="text-xs text-[#4a5565]">({item.sku})</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                            expired ? 'bg-[#f04438]' : 'bg-[#f79009]'
                          }`}
                        >
                          {expiryLabel(item.daysLeft)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <span className="text-[#4a5565]">
                          Expires:{' '}
                          <span className="font-semibold text-[#101828]">{formatExpiryDate(item.expiryDate)}</span>
                        </span>
                        <span className="text-[#4a5565]">
                          Stock: <span className="font-semibold text-[#101828]">{item.stock}</span>
                        </span>
                        <span className="text-[#4a5565]">
                          At risk:{' '}
                          <span className={`font-semibold ${expired ? 'text-[#f04438]' : 'text-[#101828]'}`}>
                            {fmt(item.atRiskValue)}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 bg-[#f9fafb] text-[#4a5565] rounded text-xs">{item.category}</span>
                      </div>
                    </div>
                    <Link
                      href="/stocks"
                      className="ml-4 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      Adjust Stock
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* No Sales */}
        <div id="no-sales-section" className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec] overflow-hidden scroll-mt-6">
          <div className="px-5 py-4 bg-[#fffaeb] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#f79009]" />
              <h2 className="text-base font-semibold text-[#101828]">No Sales Alert</h2>
              <span className="px-2 py-0.5 bg-[#f79009] text-white text-xs font-medium rounded-full">
                {noSales.length}
              </span>
            </div>
            <Link href="/products" className="text-sm text-[var(--color-primary)] hover:underline font-medium">
              View All Products
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {noSales.length === 0 ? (
              <p className="text-sm text-[#4a5565] text-center py-4">All products have recent sales</p>
            ) : (
              noSales.map((item) => (
                <div key={item.id} className="p-4 bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-between hover:border-[#f79009]/20 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#101828] mb-1">{item.product}</div>
                    <div className="flex items-center gap-3 text-xs text-[#4a5565]">
                      <span>SKU: {item.sku}</span>
                      {item.lastSale && <span>Last Sale: {item.lastSale}</span>}
                      <span className="text-[#f79009] font-medium">{item.daysAgo} days without sales</span>
                    </div>
                  </div>
                  <Link
                    href="/products"
                    className="ml-4 flex items-center gap-1 text-[var(--color-primary)] hover:underline text-sm font-medium"
                  >
                    View Product <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inactive Cashiers */}
        <div id="inactive-staff-section" className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec] overflow-hidden scroll-mt-6">
          <div className="px-5 py-4 bg-[#fffaeb] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-[#f79009]" />
              <h2 className="text-base font-semibold text-[#101828]">Inactive Employee Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f79009] text-white text-xs font-medium rounded-full">
                {inactiveStaff.length}
              </span>
            </div>
            <Link href="/employees" className="text-sm text-[var(--color-primary)] hover:underline font-medium">
              View All Employees
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {inactiveStaff.length === 0 ? (
              <p className="text-sm text-[#4a5565] text-center py-4">All employees are active</p>
            ) : (
              inactiveStaff.map((cashier) => (
                <div key={cashier.id} className="p-4 bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-[#f79009] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">
                        {cashier.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#101828]">{cashier.name}</div>
                      <div className="text-xs text-[#4a5565]">
                        {cashier.role} · Last login: {cashier.lastLogin} · {cashier.daysInactive} days active
                      </div>
                    </div>
                  </div>
                  <Link href="/employees" className="ml-4 flex items-center gap-1 text-[var(--color-primary)] hover:underline text-sm font-medium">
                    View Employee <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
