'use client';

import { useState, useEffect } from 'react';
import type React from 'react';
import { Building2, Users, TrendingUp, UserPlus, RefreshCw, CheckCircle, XCircle, Slash, Star, Award, Bell, Store, Trash2, AlertTriangle, CheckCheck } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import LineChart from '../components/charts/LineChart';
import DoughnutChart from '../components/charts/DoughnutChart';
import { tenantAPI, notificationAPI } from '../../utils/api';

interface MonthlyGrowth { label: string; count: number }
interface TenantListItem { _id: string; businessName: string; status: string; subscription: { plan: string; status: string }; email: string; createdAt: string; updatedAt: string }
interface Analytics { totalTenants: number; activeTenants: number; inactiveTenants: number; suspendedTenants: number; recentTenants: number; subscriptionDistribution: { _id: string; count: number }[]; monthlyGrowth: MonthlyGrowth[]; tenantList: TenantListItem[] }
interface Notification { _id: string; type: string; title: string; message: string; tenantName?: string; read: boolean; createdAt: string }

const notifIcon: Record<string, React.ReactNode> = {
  tenant_created: <Store className="w-4 h-4 text-green-600" />,
  tenant_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
  tenant_suspended: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  tenant_activated: <CheckCircle className="w-4 h-4 text-blue-500" />,
  tenant_updated: <RefreshCw className="w-4 h-4 text-gray-500" />,
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await tenantAPI.getAnalytics();
      if (res.success) setAnalytics(res.analytics);
    } catch (err) { console.error('Failed to load analytics:', err); }
    finally { setLoading(false); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  useEffect(() => { fetchAnalytics(); fetchNotifications(); }, []);

  const kpiCards = [
    { icon: Building2, label: 'TOTAL TENANTS', value: analytics ? String(analytics.totalTenants) : '—', change: analytics ? `↑ ${analytics.recentTenants} new this month` : '', changePositive: true },
    { icon: Users, label: 'ACTIVE TENANTS', value: analytics ? String(analytics.activeTenants) : '—', change: analytics ? `↑ ${Math.round((analytics.activeTenants / (analytics.totalTenants || 1)) * 100)}% active rate` : '', changePositive: true },
    { icon: TrendingUp, label: 'INACTIVE TENANTS', value: analytics ? String(analytics.inactiveTenants) : '—', change: analytics ? `${analytics.suspendedTenants} suspended` : '', changePositive: false },
    { icon: UserPlus, label: 'NEW THIS MONTH', value: analytics ? String(analytics.recentTenants) : '—', change: '', changePositive: true },
  ];

  const statusData = { labels: ['Active', 'Inactive', 'Suspended'], values: analytics ? [analytics.activeTenants, analytics.inactiveTenants, analytics.suspendedTenants] : [0, 0, 0], colors: ['#10b981', '#6b7280', '#ef4444'] };
  const subscriptionData = { labels: analytics?.subscriptionDistribution.map((d) => d._id || 'free') ?? [], values: analytics?.subscriptionDistribution.map((d) => d.count) ?? [], colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'] };
  const growthChartData = { labels: analytics?.monthlyGrowth.map((m) => m.label) ?? [], values: analytics?.monthlyGrowth.map((m) => m.count) ?? [] };

  const computedAlerts = analytics ? [
    analytics.inactiveTenants > 0 && { title: 'Inactive Tenants', description: `${analytics.inactiveTenants} tenant${analytics.inactiveTenants > 1 ? 's are' : ' is'} currently inactive`, action: 'View Tenants', color: 'yellow' },
    analytics.suspendedTenants > 0 && { title: 'Suspended Tenants', description: `${analytics.suspendedTenants} tenant${analytics.suspendedTenants > 1 ? 's are' : ' is'} suspended`, action: 'Review Now', color: 'red' },
    analytics.tenantList.filter((t) => t.subscription?.status === 'trial').length > 0 && { title: 'Trial Tenants', description: `${analytics.tenantList.filter((t) => t.subscription?.status === 'trial').length} tenant(s) on a trial plan`, action: 'Send Upgrade Email', color: 'blue' },
    analytics.recentTenants > 0 && { title: 'New Onboardings', description: `${analytics.recentTenants} new tenant${analytics.recentTenants > 1 ? 's' : ''} joined in the last 30 days`, action: 'View Details', color: 'green' },
  ].filter(Boolean) : [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { active: 'bg-green-100 text-green-800', inactive: 'bg-yellow-100 text-yellow-800', suspended: 'bg-red-100 text-red-800', trial: 'bg-blue-100 text-blue-800' };
    const icons: Record<string, React.ReactNode> = { active: <CheckCircle className="w-3 h-3 inline mr-1 text-green-700" />, inactive: <XCircle className="w-3 h-3 inline mr-1 text-yellow-700" />, suspended: <Slash className="w-3 h-3 inline mr-1 text-red-700" /> };
    const n = status.toLowerCase();
    return <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[n] ?? 'bg-gray-100 text-gray-700'}`}>{icons[n]}{status}</span>;
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = { basic: 'bg-blue-100 text-blue-800', premium: 'bg-purple-200 text-purple-900' };
    const n = plan?.toLowerCase() ?? 'basic';
    const UseIcon = n === 'premium' ? Award : Star;
    return <span className={`px-2 py-1 text-xs font-semibold rounded capitalize ${styles[n] ?? 'bg-blue-100 text-blue-800'}`}><UseIcon className="w-3 h-3 inline mr-1" />{plan || 'basic'}</span>;
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time platform insights and business intelligence</p>
          </div>
          <button onClick={fetchAnalytics} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition" style={{ backgroundColor: '#151194' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#6366f120' }}>
                  <card.icon className="w-6 h-6" style={{ color: '#6366f1' }} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{card.value}</p>
              {card.change && <p className={`text-sm ${card.changePositive ? 'text-green-600' : 'text-red-600'}`}>{card.change}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Status Distribution</h3>
            <DoughnutChart data={statusData} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h3>
            {subscriptionData.labels.length > 0 ? <DoughnutChart data={subscriptionData} /> : <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Growth Over Time (Last 12 Months)</h3>
          {growthChartData.labels.length > 0 ? <LineChart data={growthChartData} title="New Tenants" /> : <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Tenant Overview</h3></div>
          {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#151194' }}>
                  <tr>{['TENANT NAME', 'EMAIL', 'STATUS', 'PLAN', 'SUBSCRIPTION STATUS', 'JOINED'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-white uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics?.tenantList.map((tenant) => (
                    <tr key={tenant._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.businessName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.email}</td>
                      <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                      <td className="px-6 py-4">{getPlanBadge(tenant.subscription?.plan)}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded capitalize bg-gray-100 text-gray-700">{tenant.subscription?.status || 'active'}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(tenant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!analytics?.tenantList || analytics.tenantList.length === 0) && <div className="p-8 text-center text-gray-400">No tenants found</div>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System health alerts */}
          {computedAlerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
              <div className="space-y-3">
                {(computedAlerts as { title: string; description: string; action: string; color: string }[]).map((alert, i) => {
                  const bgColors: Record<string, string> = { yellow: 'bg-yellow-50 border-yellow-200', blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', red: 'bg-red-50 border-red-200' };
                  return (
                    <div key={i} className={`p-4 rounded-lg border ${bgColors[alert.color] ?? 'bg-gray-50 border-gray-200'}`}>
                      <p className="font-semibold text-gray-900 mb-1">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent activity notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No activity yet. Notifications will appear here when tenants are created, updated, or deleted.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className={`flex gap-3 p-3 rounded-lg border ${n.read ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50/40'}`}>
                    <div className="p-1.5 bg-gray-100 rounded-lg flex-shrink-0 mt-0.5">
                      {notifIcon[n.type] ?? <Bell className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
