'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut, Settings, UserCircle } from 'lucide-react';

interface UserData {
  name?: string;
  email?: string;
  role?: string;
}

export default function Header() {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) {
      setUserData(JSON.parse(stored));
    }
  }, []);

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants, users, or settings..."
              className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4 ml-6">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

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
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: '#151194' }}
              >
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
