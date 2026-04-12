'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, UserMinus, AlertTriangle, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';

interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
  phone: string;
  revenue: number;
  transactions: number;
  lastActive: string;
  status: 'active' | 'inactive';
}

const roleConfig: Record<string, { bg: string; text: string }> = {
  Manager: { bg: '#eff4ff', text: '#155dfc' },
  Cashier: { bg: '#ecfdf3', text: '#12b76a' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: 'Active',   bg: '#ecfdf3', text: '#12b76a' },
  inactive: { label: 'Inactive', bg: '#f2f4f7', text: '#4a5565' },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (roleFilter !== 'All Roles') params.role = roleFilter;
      if (statusFilter !== 'All Status') params.status = statusFilter;

      const res = await api.get('/employees', { params });
      setEmployees(res.data.data ?? []);
    } catch {
      setError('Failed to load employees. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchEmployees, search]);

  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#101828] mb-1">Employees</h1>
          <p className="text-sm text-[#4a5565]">Manage store staff and cashiers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#155dfc] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Alert Banner */}
      {!loading && inactiveCount > 0 && (
        <div className="bg-[#fffaeb] border border-[#f79009]/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#f79009] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#101828] mb-1">
              {inactiveCount} cashier{inactiveCount > 1 ? 's' : ''} inactive for 7+ days
            </h3>
            <p className="text-xs text-[#4a5565]">Review employee activity and consider reassignment</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
          >
            <option>All Roles</option>
            <option>Manager</option>
            <option>Cashier</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">All Employees</h2>
          <p className="text-xs text-[#4a5565] mt-1">
            {loading ? 'Loading...' : `Showing ${employees.length} employees`}
          </p>
        </div>

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#155dfc] animate-spin" />
            <span className="ml-3 text-[#4a5565]">Loading employees…</span>
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchEmployees}
              className="px-4 py-2 bg-[#155dfc] text-white rounded-lg text-sm hover:bg-[#0d4dd9] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center text-[#4a5565]">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['Employee', 'Role', 'Contact', 'Revenue', 'Transactions', 'Last Active', 'Status', 'Actions'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {employees.map((employee) => (
                  <tr key={String(employee.id)} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#155dfc] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">{employee.avatar}</span>
                        </div>
                        <div className="text-sm font-medium text-[#101828]">{employee.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: roleConfig[employee.role]?.bg,
                          color: roleConfig[employee.role]?.text,
                        }}
                      >
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#101828]">{employee.email}</div>
                      <div className="text-xs text-[#4a5565]">{employee.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-[#101828]">
                        LKR {employee.revenue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#101828]">{employee.transactions}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#4a5565]">{employee.lastActive}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusConfig[employee.status]?.bg,
                          color: statusConfig[employee.status]?.text,
                        }}
                      >
                        {statusConfig[employee.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-[#4a5565] hover:text-[#155dfc] hover:bg-[#eff4ff] rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-[#4a5565] hover:text-[#f04438] hover:bg-[#fef3f2] rounded transition-colors">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
