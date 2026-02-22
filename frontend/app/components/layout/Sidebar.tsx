'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  RotateCcw,
  CreditCard,
  Warehouse,
  Tag,
  Users,
  User as UserIcon,
  BarChart3,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Orders', icon: ShoppingBag, path: '/orders' },
  { label: 'Refunds', icon: RotateCcw, path: '/refunds' },
  { label: 'Transactions', icon: CreditCard, path: '/transactions' },
  { label: 'Products', icon: Package, path: '/products' },
  { label: 'Inventory', icon: Warehouse, path: '/inventory' },
  { label: 'Categories', icon: Tag, path: '/categories' },
  { label: 'Employees', icon: Users, path: '/employees' },
  { label: 'Customers', icon: UserIcon, path: '/customers' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Alerts', icon: Bell, path: '/alerts', badge: 12 },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path: string) => pathname === path;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <aside className="w-60 bg-white border-r border-[#e4e7ec] flex flex-col">
      {/* Logo & Store Name */}
      <div className="h-16 flex items-center px-6 border-b border-[#e4e7ec]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#155dfc] rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#101828]">OneShop POS</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#eff4ff] text-[#155dfc] rounded-full font-medium w-fit">
              {user?.role ?? 'Manager'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.label}>
                <Link
                  href={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors relative ${
                    active
                      ? 'text-[#155dfc] bg-[#eff4ff] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#155dfc] before:rounded-r'
                      : 'text-[#4a5565] hover:bg-[#f9fafb]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-[#f04438] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - User & Logout */}
      <div className="border-t border-[#e4e7ec] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-[#155dfc] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#101828] truncate">{user?.name ?? 'User'}</div>
            <div className="text-xs text-[#4a5565]">{user?.role ?? 'Manager'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-[#f04438] hover:bg-[#fef3f2] rounded-lg transition-colors text-sm font-medium w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
