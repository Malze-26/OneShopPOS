'use client';

import { useState, useEffect, useCallback } from 'react';
import { avatarSrc } from '@/app/lib/avatarUtils';
import { Plus, Search, Eye, EyeOff, UserMinus, AlertTriangle, Loader2, X } from 'lucide-react';
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
  Manager: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
  Cashier: { bg: '#ecfdf3', text: '#12b76a' },
  'Sales Representative': { bg: '#fff7ed', text: '#ea580c' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#ecfdf3', text: '#12b76a' },
  inactive: { label: 'Inactive', bg: '#f2f4f7', text: '#4a5565' },
};

const ROLES = ['Cashier', 'Sales Representative'];

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  confirmPassword: string;
}

const emptyForm: FormState = {
  name: '', email: '', phone: '', role: 'Cashier', password: '', confirmPassword: '',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [preset, setPreset] = useState('this-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add Employee modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (roleFilter !== 'All Roles') params.role = roleFilter;
      if (statusFilter !== 'All Status') params.status = statusFilter;
      if (preset) params.preset = preset;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.data ?? []);
    } catch {
      setError('Failed to load employees. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, preset]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchEmployees, search, preset, startDate, endDate]);

  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;

  const openModal = () => { setForm(emptyForm); setFormError(''); setShowPw(false); setShowConfirmPw(false); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.password.length < 8) { setFormError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setFormError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.post('/employees', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        password: form.password,
      });
      closeModal();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.put(`/employees/${deactivateTarget.id}/deactivate`);
      setDeactivateTarget(null);
      fetchEmployees();
    } catch {
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>

          <p className="text-sm text-[#4a5565]">Manage store staff and cashiers</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Alert Banner */}
      {!loading && inactiveCount > 0 && (
        <div className="bg-[#fffaeb] border border-[#f79009]/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#f79009] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#101828] mb-1">
              {inactiveCount} employee{inactiveCount > 1 ? 's' : ''} currently inactive
            </h3>
            <p className="text-xs text-[#4a5565]">Review employee activity and consider reassignment</p>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 mb-4 relative">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#e4e7ec] w-fit shadow-sm">
          {[
            { id: 'today', label: 'Today' },
            { id: 'last-7-days', label: 'Last 7 Days' },
            { id: 'this-month', label: 'This Month' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'custom') {
                  setShowDatePicker(!showDatePicker);
                } else {
                  setPreset(item.id);
                  setStartDate('');
                  setEndDate('');
                  setShowDatePicker(false);
                }
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${preset === item.id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[#4a5565] hover:bg-[#f5f8ff] hover:text-[var(--color-primary)]'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Selected custom range label */}
        {preset === 'custom' && startDate && endDate && !showDatePicker && (
          <span className="text-xs font-medium text-[#4a5565] bg-[#f2f4f7] px-3 py-1.5 rounded-full border border-[#e4e7ec]">
            {startDate} to {endDate}
          </span>
        )}

        {/* Date Picker Popover */}
        {showDatePicker && (
          <div className="absolute top-12 left-0 z-50 bg-white p-4 rounded-xl shadow-xl border border-[#e4e7ec] w-72">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-[#101828]">Select Range</h3>
              <button onClick={() => setShowDatePicker(false)} className="text-[#667085] hover:text-[#101828]">
                <span className="text-lg">×</span>
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#475467] mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d0d5dd] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475467] mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d0d5dd] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setPreset('custom');
                setShowDatePicker(false);
              }}
              disabled={!startDate || !endDate}
              className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              Apply Range
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option>All Roles</option>
            <option>Manager</option>
            <option>Cashier</option>
            <option>Sales Representative</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#4a5565] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e4e7ec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828]">All Employees</h2>
          <p className="text-xs text-[#4a5565] mt-1">
            {loading ? 'Loading...' : `Showing ${employees.length} employees`}
          </p>
        </div>

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            <span className="ml-3 text-[#4a5565]">Loading employees…</span>
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchEmployees} className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90" style={{ background: 'var(--color-primary)' }}>Retry</button>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center text-[#4a5565]">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f9fafb] border-b border-[#e4e7ec]">
                <tr>
                  {['Employee', 'Role', 'Contact', 'Revenue', 'Transactions', 'Last Active', 'Status', 'Actions'].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-[#4a5565] uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {employees.map((emp) => (
                  <tr key={String(emp.id)} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden" style={{ background: 'var(--color-primary)' }}>
                          {avatarSrc(emp.avatar)
                            ? <img src={avatarSrc(emp.avatar)} alt={emp.name} className="w-full h-full object-cover" />
                            : emp.avatar}
                        </div>
                        <div className="text-sm font-medium text-[#101828]">{emp.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: roleConfig[emp.role]?.bg ?? '#f2f4f7', color: roleConfig[emp.role]?.text ?? '#4a5565' }}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#101828]">{emp.email}</div>
                      <div className="text-xs text-[#4a5565]">{emp.phone}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#101828]">LKR {emp.revenue.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-[#101828]">{emp.transactions}</td>
                    <td className="px-5 py-4 text-sm text-[#4a5565]">{emp.lastActive}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusConfig[emp.status]?.bg, color: statusConfig[emp.status]?.text }}>
                        {statusConfig[emp.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {emp.status === 'active' && emp.role !== 'Manager' && (
                        <button
                          onClick={() => setDeactivateTarget(emp)}
                          className="p-1.5 text-[#4a5565] hover:text-[#f04438] hover:bg-[#fef3f2] rounded transition-colors"
                          title="Deactivate"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">Add Employee</h2>
                <p className="text-xs text-[#4a5565] mt-0.5">Fill in the details to create a new account</p>
              </div>
              <button onClick={closeModal} className="p-1.5 text-[#4a5565] hover:bg-[#f2f4f7] rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#101828] mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Kasun Perera"
                    className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#101828] mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@opendoor.lk"
                    className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+94 77 000 0000"
                    className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Role <span className="text-red-500">*</span></label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 8 characters"
                      className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a5565]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'} required
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="w-full border border-[#e4e7ec] rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a5565]">
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2" style={{ background: 'var(--color-primary)' }}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirmation ── */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactivateTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-[#fef3f2] rounded-full flex items-center justify-center mx-auto mb-4">
              <UserMinus className="w-6 h-6 text-[#f04438]" />
            </div>
            <h3 className="text-base font-semibold text-[#101828] mb-1">Deactivate Employee</h3>
            <p className="text-sm text-[#4a5565] mb-5">
              Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong>? They will no longer be able to log in.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeactivateTarget(null)} className="flex-1 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm font-medium text-[#4a5565] hover:bg-[#f9fafb] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeactivate} disabled={deactivating} className="flex-1 px-4 py-2 bg-[#f04438] hover:bg-[#d92d20] text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {deactivating && <Loader2 className="w-4 h-4 animate-spin" />}
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
