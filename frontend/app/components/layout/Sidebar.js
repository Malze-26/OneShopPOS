'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { path: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/super-admin/tenants', icon: Store, label: 'Tenants' },
    { path: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/super-admin/users', icon: Users, label: 'Users' },
    { path: '/super-admin/settings', icon: Settings, label: 'Settings' },
  ];

  // consider a menu item active if the current pathname matches exactly
  // or contains the item's path (covers query params, deeper routes, trailing slash)
  const isActive = (path) =>
    pathname === path ||
    pathname.startsWith(path + '/') ||
    pathname.includes(path);

  // ← THIS IS WHERE: Logout function
  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    
    if (confirmLogout) {
      // Clear all stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      router.push('/login');
    }
  };

  return (
    <div
      className={`text-white h-screen transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      } flex flex-col`}
      style={{ backgroundColor: '#151194' }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: '#0d0a62' }}>
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
            className={`w-5 h-5 transition-transform ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(item.path)
                  ? 'bg-white bg-opacity-20 text-blue-500'
                  : 'text-white text-opacity-70 hover:bg-white hover:bg-opacity-10'
              }`}
              title={collapsed ? item.label : ''}              style={isActive(item.path) ? { color: '#151194' } : {}}            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button - ← THIS IS WHERE: Using the handleLogout function */}
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