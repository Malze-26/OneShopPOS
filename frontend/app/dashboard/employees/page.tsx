'use client';

import { Plus, Search, Edit, UserMinus, AlertTriangle } from 'lucide-react';

const employeesData = [
  {
    id: 1,
    name: 'Kasun Perera',
    avatar: 'KP',
    role: 'Manager',
    email: 'kasun@store.com',
    phone: '+94 77 123 4567',
    revenue: 456000,
    transactions: 542,
    lastActive: '2026-02-20 10:45 AM',
    status: 'active',
  },
  {
    id: 2,
    name: 'Nimal Silva',
    avatar: 'NS',
    role: 'Cashier',
    email: 'nimal@store.com',
    phone: '+94 77 234 5678',
    revenue: 389000,
    transactions: 478,
    lastActive: '2026-02-20 09:30 AM',
    status: 'active',
  },
  {
    id: 3,
    name: 'Saman Fernando',
    avatar: 'SF',
    role: 'Cashier',
    email: 'saman@store.com',
    phone: '+94 77 345 6789',
    revenue: 312000,
    transactions: 398,
    lastActive: '2026-02-19 06:15 PM',
    status: 'active',
  },
  {
    id: 4,
    name: 'Dilani Rajapaksa',
    avatar: 'DR',
    role: 'Cashier',
    email: 'dilani@store.com',
    phone: '+94 77 456 7890',
    revenue: 245000,
    transactions: 312,
    lastActive: '2026-02-13 11:20 AM',
    status: 'inactive',
  },
  {
    id: 5,
    name: 'Priya Wickramasinghe',
    avatar: 'PW',
    role: 'Cashier',
    email: 'priya@store.com',
    phone: '+94 77 567 8901',
    revenue: 198000,
    transactions: 267,
    lastActive: '2026-02-20 08:00 AM',
    status: 'active',
  },
  {
    id: 6,
    name: 'Ravi Jayawardena',
    avatar: 'RJ',
    role: 'Cashier',
    email: 'ravi@store.com',
    phone: '+94 77 678 9012',
    revenue: 156000,
    transactions: 203,
    lastActive: '2026-02-12 03:45 PM',
    status: 'inactive',
  },
];

const roleConfig: Record<string, { bg: string; text: string }> = {
  Manager: { bg: '#eff4ff', text: '#155dfc' },
  Cashier: { bg: '#ecfdf3', text: '#12b76a' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#ecfdf3', text: '#12b76a' },
  inactive: { label: 'Inactive', bg: '#f2f4f7', text: '#4a5565' },
};

const inactiveCount = employeesData.filter((e) => e.status === 'inactive').length;

export default function EmployeesPage() {
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
      {inactiveCount > 0 && (
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
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>
          <select className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[#155dfc]">
            <option>All Roles</option>
            <option>Manager</option>
            <option>Cashier</option>
          </select>
          <select className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[#155dfc]">
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
          <p className="text-xs text-[#4a5565] mt-1">Showing {employeesData.length} employees</p>
        </div>
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
              {employeesData.map((employee) => (
                <tr key={employee.id} className="hover:bg-[#f9fafb] transition-colors">
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
      </div>
    </div>
  );
}
