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

// ── Payment method colour map ──────────────────────────────────────────────
const PAYMENT_COLORS: Record<string, string> = {
  Cash: '#12b76a',
  Card: 'var(--color-primary)',
};

// ── Placeholder data ───────────────────────────────────────────────────────
// TODO: Replace each block below with a real API call once the corresponding
//       endpoint exists (see TODO comments inside each component file).

const PLACEHOLDER_SALES_TREND: SalesTrendPoint[] = [
  { date: 'Feb 14', sales: 180000 },
  { date: 'Feb 15', sales: 195000 },
  { date: 'Feb 16', sales: 210000 },
  { date: 'Feb 17', sales: 185000 },
  { date: 'Feb 18', sales: 225000 },
  { date: 'Feb 19', sales: 235000 },
  { date: 'Feb 20', sales: 245000 },
];

const PLACEHOLDER_TOP_PRODUCTS: TopProduct[] = [
  { rank: 1, name: 'Product 001', image: '📦', units: 145, revenue: 87000 },
  { rank: 2, name: 'Product 002', image: '📦', units: 132, revenue: 79200 },
  { rank: 3, name: 'Product 003', image: '📦', units: 118, revenue: 70800 },
  { rank: 4, name: 'Product 004', image: '📦', units:  95, revenue: 57000 },
  { rank: 5, name: 'Product 005', image: '📦', units:  87, revenue: 52200 },
];

const PLACEHOLDER_EMPLOYEE_PERF: EmployeePerf[] = [
  { name: 'Kasun Perera',    avatar: 'KP', revenue: 89000, transactions: 142, performance: 95 },
  { name: 'Nimal Silva',     avatar: 'NS', revenue: 76000, transactions: 128, performance: 82 },
  { name: 'Saman Fernando',  avatar: 'SF', revenue: 65000, transactions:  98, performance: 70 },
  { name: 'Dilani Rajapaksa',avatar: 'DR', revenue: 45000, transactions:  72, performance: 48 },
];

const PLACEHOLDER_RECENT_ORDERS: RecentOrder[] = [
  { id: 'ORD-001', customer: 'Customer 001', amount: 12500, status: 'completed', time: '2 min ago' },
  { id: 'ORD-002', customer: 'Customer 002', amount:  8300, status: 'pending',   time: '15 min ago' },
  { id: 'ORD-003', customer: 'Customer 003', amount: 15750, status: 'completed', time: '32 min ago' },
  { id: 'ORD-004', customer: 'Customer 004', amount:  6200, status: 'refunded',  time: '1 hr ago' },
  { id: 'ORD-005', customer: 'Customer 005', amount:  9800, status: 'completed', time: '2 hr ago' },
];

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Main manager dashboard page.
 * Assembles KPI cards, charts, and data tables from focused sub-components.
 * The payment-method breakdown is the only section currently backed by a live
 * API call; the rest use clearly-labelled placeholder data.
 */
export default function DashboardPage() {
  const { currency } = useStore();

  const [paymentData, setPaymentData] = useState<PaymentEntry[]>([]);

  // Build the stat cards using the store currency from context
  const statCards: StatCardData[] = [
    {
      title: "Today's Sales",
      value: `${currency} 245,000`,
      change: '▲ 12%',
      changeColor: '#12b76a',
      subtext: 'vs yesterday',
      icon: DollarSign,
      iconBg: '#ecfdf3',
      iconColor: '#12b76a',
    },
    {
      title: "Today's Orders",
      value: '47',
      subtext: '8 pending',
      icon: ShoppingBag,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
    },
    {
      title: 'Total Customers',
      value: '1,248',
      subtext: '23 new today',
      icon: Users,
      iconBg: '#f4f3ff',
      iconColor: '#7f56d9',
    },
    {
      title: 'Low Stock Items',
      value: '24',
      subtext: 'Needs restocking',
      icon: AlertTriangle,
      iconBg: '#fef3f2',
      iconColor: '#f04438',
      linkTo: '/alerts',
    },
  ];

  /** Fetches the live payment-method breakdown from the transactions stats API. */
  useEffect(() => {
    api
      .get<{ data: Record<string, { total: number; count: number }> }>('/transactions/stats')
      .then(({ data: res }) => {
        const totalAmount = Object.values(res.data).reduce((sum, v) => sum + v.total, 0);

        const entries: PaymentEntry[] = Object.entries(res.data)
          .filter(([name]) => name === 'Cash' || name === 'Card')
          .map(([name, v]) => ({
            name,
            amount: v.total,
            value: totalAmount > 0 ? Math.round((v.total / totalAmount) * 100) : 0,
            color: PAYMENT_COLORS[name] ?? '#ccc',
          }));

        setPaymentData(entries);
      })
      .catch(() => {
        // Payment stats are non-critical — fail silently and show empty chart
      });
  }, []);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SalesTrendChart data={PLACEHOLDER_SALES_TREND} />
        <PaymentMethodChart data={paymentData} currency={currency} />
      </div>

      {/* Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <TopProductsTable products={PLACEHOLDER_TOP_PRODUCTS} currency={currency} />
        <EmployeePerformanceList employees={PLACEHOLDER_EMPLOYEE_PERF} currency={currency} />
        <RecentOrdersList orders={PLACEHOLDER_RECENT_ORDERS} currency={currency} />
      </div>
    </div>
  );
}
