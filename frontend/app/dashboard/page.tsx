'use client';

import Link from 'next/link';
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const stats = [
  {
    title: "Today's Sales",
    value: 'LKR 245,000',
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
    iconBg: '#eff4ff',
    iconColor: '#155dfc',
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
    linkTo: '/dashboard/alerts',
  },
];

const salesTrendData = [
  { date: 'Feb 14', sales: 180000 },
  { date: 'Feb 15', sales: 195000 },
  { date: 'Feb 16', sales: 210000 },
  { date: 'Feb 17', sales: 185000 },
  { date: 'Feb 18', sales: 225000 },
  { date: 'Feb 19', sales: 235000 },
  { date: 'Feb 20', sales: 245000 },
];

const paymentMethodData = [
  { name: 'Cash', value: 45, amount: 110250, color: '#12b76a' },
  { name: 'Card', value: 40, amount: 98000, color: '#155dfc' },
  { name: 'Bank Transfer', value: 15, amount: 36750, color: '#f79009' },
];

const topProducts = [
  { rank: 1, name: 'Product 001', image: '📦', units: 145, revenue: 87000 },
  { rank: 2, name: 'Product 002', image: '📦', units: 132, revenue: 79200 },
  { rank: 3, name: 'Product 003', image: '📦', units: 118, revenue: 70800 },
  { rank: 4, name: 'Product 004', image: '📦', units: 95, revenue: 57000 },
  { rank: 5, name: 'Product 005', image: '📦', units: 87, revenue: 52200 },
];

const employeePerformance = [
  { name: 'Kasun Perera', avatar: 'KP', revenue: 89000, transactions: 142, performance: 95 },
  { name: 'Nimal Silva', avatar: 'NS', revenue: 76000, transactions: 128, performance: 82 },
  { name: 'Saman Fernando', avatar: 'SF', revenue: 65000, transactions: 98, performance: 70 },
  { name: 'Dilani Rajapaksa', avatar: 'DR', revenue: 45000, transactions: 72, performance: 48 },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'Customer 001', amount: 12500, status: 'completed', time: '2 min ago' },
  { id: 'ORD-002', customer: 'Customer 002', amount: 8300, status: 'pending', time: '15 min ago' },
  { id: 'ORD-003', customer: 'Customer 003', amount: 15750, status: 'completed', time: '32 min ago' },
  { id: 'ORD-004', customer: 'Customer 004', amount: 6200, status: 'refunded', time: '1 hr ago' },
  { id: 'ORD-005', customer: 'Customer 005', amount: 9800, status: 'completed', time: '2 hr ago' },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#ecfdf3', text: '#12b76a' },
  pending: { bg: '#fffaeb', text: '#f79009' },
  refunded: { bg: '#fef3f2', text: '#f04438' },
};

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-[1400px]">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-[#4a5565] mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-[#101828] mb-1">{stat.value}</h3>
                {stat.change && (
                  <span className="text-sm font-medium" style={{ color: stat.changeColor }}>
                    {stat.change}
                  </span>
                )}
                <p className="text-xs text-[#4a5565] mt-1">{stat.subtext}</p>
              </div>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.iconBg }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.iconColor }} />
              </div>
            </div>
            {stat.linkTo && (
              <Link href={stat.linkTo} className="text-sm text-[#155dfc] hover:underline font-medium">
                View Details →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Middle Section - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Sales Trend</h2>
              <p className="text-xs text-[#4a5565] mt-1">Last 7 days performance</p>
            </div>
            <select className="px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis dataKey="date" stroke="#4a5565" style={{ fontSize: '12px' }} />
              <YAxis stroke="#4a5565" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e7ec', borderRadius: '8px' }}
                labelStyle={{ color: '#101828', fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="sales" stroke="#155dfc" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828] mb-1">Payment Methods</h2>
          <p className="text-xs text-[#4a5565] mb-4">Today&apos;s breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {paymentMethodData.map((method) => (
              <div key={method.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                  <span className="text-[#4a5565]">{method.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[#101828]">{method.value}%</div>
                  <div className="text-xs text-[#4a5565]">LKR {method.amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Top Selling Products */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Top Selling Products</h2>
              <p className="text-xs text-[#4a5565] mt-1">This week&apos;s best performers</p>
            </div>
            <Link href="/dashboard/products" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((product) => (
              <div key={product.rank} className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] rounded-lg transition-colors">
                <div className="w-6 h-6 flex items-center justify-center bg-[#f9fafb] rounded text-xs font-semibold text-[#4a5565]">
                  {product.rank}
                </div>
                <div className="w-8 h-8 flex items-center justify-center bg-[#eff4ff] rounded text-lg">
                  {product.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#101828] truncate">{product.name}</div>
                  <div className="text-xs text-[#4a5565]">{product.units} units sold</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#101828]">LKR {product.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#101828]">Employee Performance</h2>
            <p className="text-xs text-[#4a5565] mt-1">Today&apos;s cashiers</p>
          </div>
          <div className="space-y-3">
            {employeePerformance.map((employee) => (
              <div key={employee.name} className="relative">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 bg-[#155dfc] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">{employee.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#101828] truncate">{employee.name}</div>
                    <div className="text-xs text-[#4a5565]">{employee.transactions} transactions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#101828]">LKR {employee.revenue.toLocaleString()}</div>
                  </div>
                </div>
                <div
                  className="absolute inset-0 bg-[#eff4ff] rounded"
                  style={{ width: `${employee.performance}%`, zIndex: 0 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Recent Orders</h2>
              <p className="text-xs text-[#4a5565] mt-1">Latest transactions</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] rounded-lg transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#101828]">{order.id}</div>
                  <div className="text-xs text-[#4a5565] truncate">{order.customer}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#101828] mb-1">LKR {order.amount.toLocaleString()}</div>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: statusColors[order.status]?.bg,
                      color: statusColors[order.status]?.text,
                    }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
