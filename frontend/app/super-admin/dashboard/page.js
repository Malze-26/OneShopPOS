'use client';

import { Store, TrendingUp, Users, Package } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import MetricCard from '../../components/common/MetricCard';

export default function DashboardPage() {
  const metrics = [
    {
      icon: Store,
      label: 'Total Tenants',
      value: '45',
      trend: '12%',
      trendUp: true,
    },
    {
      icon: Users,
      label: 'Active Tenants',
      value: '38',
      trend: '8%',
      trendUp: true,
    },
    {
      icon: TrendingUp,
      label: 'Total Revenue',
      value: 'LKR 2.5M',
      trend: '15%',
      trendUp: true,
    },
    {
      icon: Package,
      label: 'Total Products',
      value: '3,450',
      trend: '5%',
      trendUp: false,
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Platform Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tenant Growth
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chart will go here
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue by Plan
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chart will go here
            </div>
          </div>
        </div>

        {/* Recent Tenants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Tenants
            </h3>
          </div>
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
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        Fashion Store {i}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      Premium
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      Feb {i}, 2025
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}