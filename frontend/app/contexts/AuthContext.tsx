'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/app/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Cashier';
  storeId: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean, expectedRole?: 'Manager' | 'Cashier') => Promise<void>;
  logout: () => void;
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
      if (expectedRole && data.user.role !== expectedRole) {
        const roleDestination = data.user.role === 'Manager' ? 'Manager login' : 'Cashier login';
        throw { response: { data: { message: `This account is a ${data.user.role}. Please use ${roleDestination}.` } } };
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));

      Cookies.set('token', data.token, {
        expires: rememberMe ? 7 : undefined,
        sameSite: 'Strict',
      });

      setToken(data.token);
      setUser(data.user);

      // Redirect based on role
      router.push(data.user.role === 'Cashier' ? '/pos/dashboard' : '/dashboard');
    },
    [router]
  );

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