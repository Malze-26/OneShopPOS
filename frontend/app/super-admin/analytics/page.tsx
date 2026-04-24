'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Slash,
  Star,
  Award,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import LineChart from '../../components/charts/LineChart';
import DoughnutChart from '../../components/charts/DoughnutChart';
import { tenantAPI } from '../../../utils/api';

interface MonthlyGrowth {
  label: string;
  count: number;
}

interface TenantListItem {
  _id: string;
  businessName: string;
  status: string;
  subscription: { plan: string; status: string };
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface Analytics {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  suspendedTenants: number;
  recentTenants: number;
  subscriptionDistribution: { _id: string; count: number }[];
  monthlyGrowth: MonthlyGrowth[];
  tenantList: TenantListItem[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await tenantAPI.getAnalytics();
      if (res.success) setAnalytics(res.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpiCards = [
    {
      icon: Building2,
      label: 'TOTAL TENANTS',
      value: analytics ? String(analytics.totalTenants) : '—',
      change: analytics ? `↑ ${analytics.recentTenants} new this month` : '',
      changePositive: true,
    },
    {
      icon: Users,
      label: 'ACTIVE TENANTS',
      value: analytics ? String(analytics.activeTenants) : '—',
      change: analytics
        ? `↑ ${Math.round((analytics.activeTenants / (analytics.totalTenants || 1)) * 100)}% active rate`
        : '',
      changePositive: true,
    },
    {
      icon: TrendingUp,
      label: 'INACTIVE TENANTS',
      value: analytics ? String(analytics.inactiveTenants) : '—',
      change: analytics ? `${analytics.suspendedTenants} suspended` : '',
      changePositive: false,
    },
    {
      icon: UserPlus,
      label: 'NEW THIS MONTH',
      value: analytics ? String(analytics.recentTenants) : '—',
      change: '',
      changePositive: true,
    },
  ];

  const statusData = {
    labels: ['Active', 'Inactive', 'Suspended'],
    values: analytics
      ? [analytics.activeTenants, analytics.inactiveTenants, analytics.suspendedTenants]
      : [0, 0, 0],
    colors: ['#10b981', '#6b7280', '#ef4444'],
  };

  const subscriptionData = {
    labels: analytics?.subscriptionDistribution.map((d) => d._id || 'free') ?? [],
    values: analytics?.subscriptionDistribution.map((d) => d.count) ?? [],
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  };

  const growthChartData = {
    labels: analytics?.monthlyGrowth.map((m) => m.label) ?? [],
    values: analytics?.monthlyGrowth.map((m) => m.count) ?? [],
  };

  // Compute alerts from real data
  const computedAlerts = analytics
    ? [
        analytics.inactiveTenants > 0 && {
          title: 'Inactive Tenants',
          description: `${analytics.inactiveTenants} tenant${analytics.inactiveTenants > 1 ? 's are' : ' is'} currently inactive`,
          action: 'View Tenants',
          color: 'yellow',
        },
        analytics.suspendedTenants > 0 && {
          title: 'Suspended Tenants',
          description: `${analytics.suspendedTenants} tenant${analytics.suspendedTenants > 1 ? 's are' : ' is'} suspended`,
          action: 'Review Now',
          color: 'red',
        },
        analytics.tenantList.filter((t) => t.subscription?.status === 'trial').length > 0 && {
          title: 'Trial Tenants',
          description: `${analytics.tenantList.filter((t) => t.subscription?.status === 'trial').length} tenant${analytics.tenantList.filter((t) => t.subscription?.status === 'trial').length > 1 ? 's are' : ' is'} on a trial plan`,
          action: 'Send Upgrade Email',
          color: 'blue',
        },
        analytics.recentTenants > 0 && {
          title: 'New Onboardings',
          description: `${analytics.recentTenants} new tenant${analytics.recentTenants > 1 ? 's' : ''} joined in the last 30 days`,
          action: 'View Details',
          color: 'green',
        },
      ].filter(Boolean)
    : [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
    };
    const icons: Record<string, React.ReactNode> = {
      active: <CheckCircle className="w-3 h-3 inline mr-1 text-green-700" />,
      inactive: <XCircle className="w-3 h-3 inline mr-1 text-yellow-700" />,
      suspended: <Slash className="w-3 h-3 inline mr-1 text-red-700" />,
    };
    const normalized = status.toLowerCase();
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[normalized] ?? 'bg-gray-100 text-gray-700'}`}>
        {icons[normalized]}
        {status}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-200 text-purple-900',
      enterprise: 'bg-green-100 text-green-900',
    };
    const normalized = plan?.toLowerCase() ?? 'free';
    const UseIcon = ['premium', 'enterprise'].includes(normalized) ? Award : Star;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded capitalize ${styles[normalized] ?? 'bg-gray-100 text-gray-800'}`}>
        <UseIcon className="w-3 h-3 inline mr-1" />
        {plan || 'free'}
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
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition"
            style={{ backgroundColor: '#151194' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#6366f120' }}>
                  <card.icon className="w-6 h-6" style={{ color: '#6366f1' }} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{card.value}</p>
              {card.change && (
                <p className={`text-sm ${card.changePositive ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Status Distribution</h3>
            <DoughnutChart data={statusData} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h3>
            {subscriptionData.labels.length > 0 ? (
              <DoughnutChart data={subscriptionData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Growth Chart — real data from DB */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Growth Over Time (Last 12 Months)</h3>
          {growthChartData.labels.length > 0 ? (
            <LineChart data={growthChartData} title="New Tenants" />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
          )}
        </div>

        {/* Performance Table — real tenant data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Tenant Overview</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#151194' }}>
                  <tr>
                    {['TENANT NAME', 'EMAIL', 'STATUS', 'PLAN', 'SUBSCRIPTION STATUS', 'JOINED'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics?.tenantList.map((tenant) => (
                    <tr key={tenant._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.businessName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.email}</td>
                      <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                      <td className="px-6 py-4">{getPlanBadge(tenant.subscription?.plan)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded capitalize bg-gray-100 text-gray-700">
                          {tenant.subscription?.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!analytics?.tenantList || analytics.tenantList.length === 0) && (
                <div className="p-8 text-center text-gray-400">No tenants found</div>
              )}
            </div>
          )}
        </div>

        {/* Alerts — computed from real data */}
        {computedAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Notifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(computedAlerts as { title: string; description: string; action: string; color: string }[]).map((alert, index) => {
                const bgColors: Record<string, string> = {
                  yellow: 'bg-yellow-50 border-yellow-200',
                  blue: 'bg-blue-50 border-blue-200',
                  green: 'bg-green-50 border-green-200',
                  red: 'bg-red-50 border-red-200',
                };
                return (
                  <div key={index} className={`p-4 rounded-lg border ${bgColors[alert.color] ?? 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-semibold text-gray-900 mb-1">{alert.title}</p>
                    <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {alert.action} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
