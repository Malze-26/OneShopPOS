'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, User, ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

const pageTitle: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/orders': 'Orders',
  '/dashboard/refunds': 'Refunds',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/products': 'Products',
  '/dashboard/products/add': 'Add Product',
  '/dashboard/products/edit': 'Edit Product',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/categories': 'Categories',
  '/dashboard/employees': 'Employees',
  '/dashboard/customers': 'Customers',
  '/dashboard/reports': 'Reports',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/settings': 'Settings',
  '/dashboard/profile': 'My Profile',
};

export function TopHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const currentTitle = pageTitle[pathname] ?? 'Dashboard';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-[#e4e7ec] px-6">
      <div className="h-full flex items-center justify-between">
        {/* Left - Page Title */}
        <div>
          <h1 className="text-xl font-bold text-[#101828]">{currentTitle}</h1>
        </div>

        {/* Right - Search, Notifications & User */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565]" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-[280px] pl-10 pr-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[#155dfc] focus:border-transparent transition-all bg-white"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 text-[#4a5565] hover:text-[#101828] hover:bg-[#f9fafb] rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f04438] rounded-full"></span>
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#f9fafb] rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-[#155dfc] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">{initials}</span>
              </div>
              <span className="text-sm font-medium text-[#101828]">{user?.name ?? 'User'}</span>
              <ChevronDown className="w-4 h-4 text-[#4a5565]" />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#e4e7ec] py-2 z-20">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#4a5565] hover:bg-[#f9fafb] transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                  <div className="border-t border-[#e4e7ec] my-1"></div>
                  <button
                    onClick={() => { setShowDropdown(false); logout(); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#f04438] hover:bg-[#fef3f2] transition-colors font-medium w-full"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
