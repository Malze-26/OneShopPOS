'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/app/lib/api';

// Authentication context to manage user sessions, login/logout, and profile refresh
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Cashier' | 'Sales Representative';
  storeId: string;
  phone?: string;
  avatar?: string;
}

// Defines the shape of the authentication context value, including user info, token, loading state, and auth functions
interface AuthContextValue {
  user: User | null;
  token: string | null; // JWT token for authenticated API requests
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean, expectedRole?: 'Manager' | 'Cashier') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const storedToken =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token');
    const storedUser =
      localStorage.getItem('user') ||
      sessionStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Fetch fresh user data so name/role changes are reflected immediately
        api.get<User>('/auth/me').then(({ data }) => {
          setUser(data);
          const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(data));
        }).catch(() => {
          // Token expired or invalid — clear session
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setToken(null);
          setUser(null);
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false, expectedRole?: 'Manager' | 'Cashier') => {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });

      // Enforce role match — reject if the user logged in under the wrong role button
      if (expectedRole) {
        const isPosRole = data.user.role === 'Cashier' || data.user.role === 'Sales Representative';
        const mismatch =
          (expectedRole === 'Manager' && data.user.role !== 'Manager') ||
          (expectedRole === 'Cashier' && !isPosRole);
        if (mismatch) {
          const dest = data.user.role === 'Manager' ? 'Manager login' : 'Cashier login';
          throw { response: { data: { message: `This account is a ${data.user.role}. Please use ${dest}.` } } };
        }
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      // Set a cookie for server-side authentication (if needed)
      Cookies.set('token', data.token, {
        expires: rememberMe ? 7 : undefined,
        sameSite: 'Strict',
      });

      setToken(data.token);
      setUser(data.user);

      // Redirect based on role
      const isPosUser = data.user.role === 'Cashier' || data.user.role === 'Sales Representative';
      router.push(isPosUser ? '/pos/dashboard' : '/dashboard');
    },
    [router]
  );

  // ── Refresh user profile ─────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const { data } = await api.get<User>('/auth/me');
    setUser(data);
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(data));
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    Cookies.remove('token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}