'use client';

import { Building2, Users, DollarSign, TrendingUp, RefreshCw, CheckCircle, XCircle, Slash, Star, Award } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import DoughnutChart from '../../components/charts/DoughnutChart';

export default function AnalyticsPage() {
  const kpiCards = [
    {
      icon: Building2,
      label: 'TOTAL TENANTS',
      value: '45',
      change: '↑ 12% from last month',
      changePositive: true,
    },
    {
      icon: Users,
      label: 'ACTIVE TENANTS',
      value: '38',
      change: '↑ 84% active rate',
      changePositive: true,
    },
    {
      icon: DollarSign,
      label: 'TOTAL REVENUE',
      value: '2.5M',
      change: '↑ 18% from last month',
      changePositive: true,
    },
    {
      icon: TrendingUp,
      label: 'NEW THIS MONTH',
      value: '5',
      change: '↑ 25% growth',
      changePositive: true,
    },
  ];

  const topTenantsData = {
    labels: ['Store 1', 'Store 2', 'Store 3', 'Store 4', 'Store 5', 'Store 6', 'Store 7', 'Store 8', 'Store 9', 'Store 10'],
    values: [500, 450, 380, 320, 290, 250, 230, 210, 180, 150],
  };

  const statusData = {
    labels: ['Active', 'Inactive', 'Suspended'],
    values: [38, 5, 2],
    colors: ['#10b981', '#6b7280', '#ef4444'],
  };

  const growthData = {
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
    values: [3, 5, 4, 7, 6, 8, 10, 9, 11, 12, 14, 15],
  };

  const subscriptionData = {
    labels: ['Basic', 'Intermediate', 'Pro', 'Premium'],
    values: [35, 28, 22, 15],
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  };

  const productsData = {
    labels: ['0-25', '26-50', '51-75', '76-100', '100+'],
    values: [8, 15, 12, 7, 3],
  };

  const performanceData = [
    { name: 'Store 1', status: 'ACTIVE', plan: 'Premium', sales: 'LKR 500,000', products: 120, users: 5, storage: '450 MB', lastActive: '2 hours ago' },
    { name: 'Store 2', status: 'ACTIVE', plan: 'Premium', sales: 'LKR 450,000', products: 95, users: 4, storage: '380 MB', lastActive: '5 hours ago' },
    { name: 'Store 3', status: 'ACTIVE', plan: 'Basic', sales: 'LKR 380,000', products: 210, users: 3, storage: '520 MB', lastActive: '1 day ago' },
    { name: 'Store 4', status: 'ACTIVE', plan: 'Enterprise', sales: 'LKR 320,000', products: 80, users: 6, storage: '680 MB', lastActive: '3 hours ago' },
    { name: 'Store 5', status: 'INACTIVE', plan: 'Basic', sales: 'LKR 0', products: 45, users: 2, storage: '180 MB', lastActive: '30 days ago' },
    { name: 'Store 6', status: 'ACTIVE', plan: 'Premium', sales: 'LKR 250,000', products: 78, users: 3, storage: '290 MB', lastActive: '1 hour ago' },
    { name: 'Store 7', status: 'ACTIVE', plan: 'Basic', sales: 'LKR 230,000', products: 92, users: 2, storage: '310 MB', lastActive: '6 hours ago' },
    { name: 'Store 8', status: 'SUSPENDED', plan: 'Free', sales: 'LKR 0', products: 15, users: 1, storage: '45 MB', lastActive: '15 days ago' },
  ];

  const alerts = [
    {
      title: 'Low Activity Tenants',
      description: '3 tenants haven\'t logged in for 30+ days',
      action: 'Send Reminder',
      color: 'yellow',
    },
    {
      title: 'Trials Expiring Soon',
      description: '5 tenants trial periods end in 7 days',
      action: 'Send Upgrade Email',
      color: 'blue',
    },
    {
      title: 'High-Value Tenant',
      description: 'Store 1 exceeded 500K LKR in sales',
      action: 'Send Congratulations',
      color: 'green',
    },
    {
      title: 'Storage Limit Warning',
      description: 'Store 3 using 95% of storage quota',
      action: 'Suggest Upgrade',
      color: 'yellow',
    },
  ];

  const getStatusBadge = (status) => {
    // colored badges with small status icons for better visibility
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-yellow-100 text-yellow-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    };
    const icons = {
      ACTIVE: <CheckCircle className="w-3 h-3 inline mr-1 text-green-800" />,
      INACTIVE: <XCircle className="w-3 h-3 inline mr-1 text-red-600" />,
      SUSPENDED: <Slash className="w-3 h-3 inline mr-1 text-red-800" />,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  }; 

  const getPlanBadge = (plan) => {
    const styles = {
      Free: 'bg-gray-100 text-gray-800',
      Basic: 'bg-blue-100 text-blue-800',
      Pro: 'bg-teal-100 text-teal-800',
      Premium: 'bg-purple-300 text-purple-900',
      Enterprise: 'bg-green-100 text-green-900',
    };
    const icons = {
      Free: <Star className="w-3 h-3 inline mr-1" />,
      Basic: <Star className="w-3 h-3 inline mr-1 text-blue-800" />,
      Pro: <Star className="w-3 h-3 inline mr-1 text-teal-800" />,
      Premium: <Award className="w-3 h-3 inline mr-1 text-purple-900" />,
      Enterprise: <Award className="w-3 h-3 inline mr-1 text-green-900" />,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[plan]}`}>
        {icons[plan]}
        {plan}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time platform insights and business intelligence</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition"
            style={{ backgroundColor: '#151194' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d0a62'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#151194'}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#6366f1' + '20' }}>
                  <card.icon className="w-6 h-6" style={{ color: '#6366f1' }} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{card.value}</p>
              <p className={`text-sm ${card.changePositive ? 'text-green-600' : 'text-red-600'}`}>
                {card.change}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📊 Top 10 Tenants by Revenue
            </h3>
            <BarChart data={topTenantsData} title="Revenue" />
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔵 Tenant Status Distribution
            </h3>
            <DoughnutChart data={statusData} />
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📈 Tenant Growth Over Time
          </h3>
          <LineChart data={growthData} title="New Tenants" />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Subscription Plans */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💳 Subscription Plans Distribution
            </h3>
            <DoughnutChart data={subscriptionData} />
          </div>

          {/* Products Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📦 Products Distribution
            </h3>
            <BarChart data={productsData} title="Product Count Range" />
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Tenant Performance Overview</h3>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              📥 Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#151194' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">TENANT NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">STATUS</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">PLAN</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">SALE (30D)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">PRODUCTS</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">USERS</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">STORAGE</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">LAST ACTIVE</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-white uppercase">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {performanceData.map((tenant, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                    <td className="px-6 py-4">{getPlanBadge(tenant.plan)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{tenant.sales}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.products}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.users}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.storage}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.lastActive}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        className="px-4 py-1 text-sm text-white rounded"
                        style={{ backgroundColor: '#151194' }}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ⚠️ Alerts & Notifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, index) => {
              const bgColors = {
                yellow: 'bg-yellow-50 border-yellow-200',
                blue: 'bg-blue-50 border-blue-200',
                green: 'bg-green-50 border-green-200',
              };
              return (
                <div key={index} className={`p-4 rounded-lg border ${bgColors[alert.color]}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{alert.title}</p>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {alert.action} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}