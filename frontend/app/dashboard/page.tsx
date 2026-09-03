'use client';

import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import { useStore } from '@/app/contexts/StoreContext';
import api from '@/app/lib/api';

import { StatCard } from '@/app/components/dashboard/StatCard';
import { SalesTrendChart } from '@/app/components/dashboard/SalesTrendChart';
import { PaymentMethodChart } from '@/app/components/dashboard/PaymentMethodChart';
import { TopProductsTable } from '@/app/components/dashboard/TopProductsTable';
import { EmployeePerformanceList } from '@/app/components/dashboard/EmployeePerformanceList';
import { RecentOrdersList } from '@/app/components/dashboard/RecentOrdersList';

import type {
  StatCardData,
  SalesTrendPoint,
  PaymentEntry,
  TopProduct,
  EmployeePerf,
  RecentOrder,
} from '@/app/components/dashboard/types';

const PAYMENT_COLORS: Record<string, string> = {
  Cash:               '#12b76a',
  Card:               'var(--color-primary)',
  Online:             '#7c3aed',
  'Cash on Delivery': '#f59e0b',
  'Bank Transfer':    '#0891b2',
};

export default function DashboardPage() {
  const { currency } = useStore();

  const [summary, setSummary]           = useState<Record<string, number>>({});
  const [salesTrend, setSalesTrend]     = useState<SalesTrendPoint[]>([]);
  const [paymentData, setPaymentData]   = useState<PaymentEntry[]>([]);
  const [topProducts, setTopProducts]   = useState<TopProduct[]>([]);
  const [employees, setEmployees]       = useState<EmployeePerf[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    api.get<{ todaySales: number; salesChange: number | null; todayOrders: number; ordersChange: number | null; pendingOrders: number; totalCustomers: number; newCustomersToday: number; lowStockItems: number }>('/dashboard/summary')
      .then(({ data }) => setSummary(data as unknown as Record<string, number>))
      .catch(() => {});

    api.get<{ data: SalesTrendPoint[] }>('/dashboard/sales-trend')
      .then(({ data }) => setSalesTrend(data.data))
      .catch(() => {});

    api.get<{ data: { method: string; count: number; total: number; percentage: number }[] }>('/dashboard/payment-methods')
      .then(({ data: res }) => {
        const entries: PaymentEntry[] = res.data.map((m) => ({
          name:   m.method,
          amount: m.total,
          value:  m.percentage,
          color:  PAYMENT_COLORS[m.method] ?? '#98a2b3',
        }));
        setPaymentData(entries);
      })
      .catch(() => {});

    api.get<{ data: TopProduct[] }>('/dashboard/top-products')
      .then(({ data }) => setTopProducts(data.data))
      .catch(() => {});

    api.get<{ data: EmployeePerf[] }>('/dashboard/employee-performance')
      .then(({ data }) => setEmployees(data.data))
      .catch(() => {});

    api.get<{ data: RecentOrder[] }>('/dashboard/recent-orders')
      .then(({ data }) => setRecentOrders(data.data))
      .catch(() => {});
  }, []);

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;

  const salesChange = summary.salesChange != null
    ? (summary.salesChange >= 0 ? `▲ ${summary.salesChange}%` : `▼ ${Math.abs(summary.salesChange)}%`)
    : undefined;

  const ordersChange = summary.ordersChange != null
    ? (summary.ordersChange >= 0 ? `▲ ${summary.ordersChange}%` : `▼ ${Math.abs(summary.ordersChange)}%`)
    : undefined;

  const statCards: StatCardData[] = [
    {
      title: "Today's Sales",
      value: fmt(summary.todaySales ?? 0),
      change: salesChange,
      changeColor: (summary.salesChange ?? 0) >= 0 ? '#12b76a' : '#f79009',
      subtext: 'vs yesterday',
      icon: DollarSign,
      iconBg: '#ecfdf3',
      iconColor: '#12b76a',
    },
    {
      title: "Today's Orders",
      value: String(summary.todayOrders ?? 0),
      change: ordersChange,
      changeColor: (summary.ordersChange ?? 0) >= 0 ? '#12b76a' : '#f79009',
      subtext: `${summary.pendingOrders ?? 0} pending`,
      icon: ShoppingBag,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
    },
    {
      title: 'Total Customers',
      value: (summary.totalCustomers ?? 0).toLocaleString(),
      subtext: `${summary.newCustomersToday ?? 0} new today`,
      icon: Users,
      iconBg: '#f4f3ff',
      iconColor: '#7f56d9',
    },
    {
      title: 'Low Stock Items',
      value: String(summary.lowStockItems ?? 0),
      subtext: 'Needs restocking',
      icon: AlertTriangle,
      iconBg: '#fef3f2',
      iconColor: '#f04438',
      linkTo: '/alerts',
    },
  ];

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SalesTrendChart data={salesTrend} />
        <PaymentMethodChart data={paymentData} currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <TopProductsTable products={topProducts} />
        <EmployeePerformanceList employees={employees} />
        <RecentOrdersList orders={recentOrders} currency={currency} />
      </div>
    </div>
  );
}
