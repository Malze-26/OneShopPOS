'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut, Settings, UserCircle, CheckCheck, Store, Trash2, RefreshCw } from 'lucide-react';
import { notificationAPI } from '../../../utils/api';

interface UserData {
  name?: string;
  email?: string;
  role?: string;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  tenantName?: string;
  read: boolean;
  createdAt: string;
}

const notificationIcon: Record<string, JSX.Element> = {
  tenant_created: <Store className="w-4 h-4 text-green-600" />,
  tenant_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
  tenant_suspended: <RefreshCw className="w-4 h-4 text-yellow-500" />,
  tenant_activated: <RefreshCw className="w-4 h-4 text-blue-500" />,
  tenant_updated: <RefreshCw className="w-4 h-4 text-gray-500" />,
};

export default function Header() {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) setUserData(JSON.parse(stored));
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getAll();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await notificationAPI.markAsRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

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

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  router.push(`/tenants?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
              placeholder="Search tenants..."
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6">
          {/* Bell icon */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.read && handleMarkRead(n._id)}
                        className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${!n.read ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg flex-shrink-0">
                          {notificationIcon[n.type] ?? <Bell className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                            {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                <p className="text-xs text-gray-500">
                  {userData?.role === 'superadmin' ? 'System Administrator' : 'Tenant Admin'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#151194' }}>
                <User className="w-5 h-5" />
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
                  <p className="text-xs text-gray-500">{userData?.email}</p>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700">
                  <UserCircle className="w-4 h-4" />
                  <span className="text-sm">My Profile</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </button>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
