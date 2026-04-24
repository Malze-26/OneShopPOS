'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Users, TrendingUp, UserPlus } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import MetricCard from '../../components/common/MetricCard';
import { tenantAPI } from '../../../utils/api';

interface Analytics {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  suspendedTenants: number;
  recentTenants: number;
  subscriptionDistribution: { _id: string; count: number }[];
}

interface RecentTenant {
  _id: string;
  businessName: string;
  status: string;
  subscription: { plan: string };
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, tenantsRes] = await Promise.all([
          tenantAPI.getAnalytics(),
          tenantAPI.getAll(),
        ]);
        if (analyticsRes.success) setAnalytics(analyticsRes.analytics);
        if (tenantsRes.success) {
          const sorted = [...tenantsRes.tenants].sort(
            (a: RecentTenant, b: RecentTenant) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentTenants(sorted.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const metrics = [
    {
      icon: Store,
      label: 'Total Tenants',
      value: analytics ? String(analytics.totalTenants) : '—',
      trend: analytics ? `${analytics.recentTenants} this month` : '',
      trendUp: true,
    },
    {
      icon: Users,
      label: 'Active Tenants',
      value: analytics ? String(analytics.activeTenants) : '—',
      trend: analytics
        ? `${Math.round((analytics.activeTenants / (analytics.totalTenants || 1)) * 100)}%`
        : '',
      trendUp: true,
    },
    {
      icon: TrendingUp,
      label: 'Inactive Tenants',
      value: analytics ? String(analytics.inactiveTenants) : '—',
      trend: '',
      trendUp: false,
    },
    {
      icon: UserPlus,
      label: 'New This Month',
      value: analytics ? String(analytics.recentTenants) : '—',
      trend: '',
      trendUp: true,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Subscription Distribution */}
        {analytics && analytics.subscriptionDistribution.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h3>
            <div className="flex gap-4 flex-wrap">
              {analytics.subscriptionDistribution.map((item) => (
                <div key={item._id} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 capitalize">{item._id || 'free'}</span>
                  <span className="font-bold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tenants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tenants</h3>
            <button
              onClick={() => router.push('/super-admin/tenants')}
              className="text-sm font-medium"
              style={{ color: '#151194' }}
            >
              View All →
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : recentTenants.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No tenants yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTenants.map((tenant) => (
                    <tr key={tenant._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {tenant.businessName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(tenant.status)}`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">
                        {tenant.subscription?.plan || 'free'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
