'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/super-admin/tenants', icon: Store, label: 'Tenants' },
  { path: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/super-admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
      router.push('/login');
    }
  };

  return (
    <div
      className={`text-white h-screen transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#151194' }}
    >
      {/* Logo */}
      <div
        className="p-6 flex items-center justify-between border-b"
        style={{ borderColor: '#0d0a62' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8" />
            <span className="text-xl font-bold">OneShop</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg transition hover:bg-white hover:bg-opacity-10"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : ''}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                active
                  ? 'bg-white bg-opacity-20'
                  : 'text-white text-opacity-70 hover:bg-white hover:bg-opacity-10'
              }`}
              style={active ? { color: '#a5b4fc' } : {}}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: '#0d0a62' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-white text-opacity-70 hover:bg-white hover:bg-opacity-10 transition w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
