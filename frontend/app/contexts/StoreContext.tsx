'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import api from '@/app/lib/api';

interface StoreSettings {
  storeName: string;
  currency: string;
  currencyLocale: string;
  address: string;
  phone: string;
  email: string;
  storeId: string;
  logoUrl: string;
  primaryColor: string;
  subscriptionPlan: string;
}

const defaults: StoreSettings = {
  storeName: 'OneShop',
  currency: 'LKR',
  currencyLocale: 'en-LK',
  address: '',
  phone: '',
  email: '',
  storeId: '',
  logoUrl: '',
  primaryColor: '#155dfc',
  subscriptionPlan: 'free',
};

interface StoreContextValue extends StoreSettings {
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue>({ ...defaults, refresh: () => Promise.resolve() });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaults);

  const applyColors = useCallback((colorHex: string) => {
    if (typeof document !== 'undefined' && colorHex) {
      const color = '#' + colorHex.replace(/^#+/, '');
      document.documentElement.style.setProperty('--color-primary', color);
      document.documentElement.style.setProperty('--primary', color);
      document.documentElement.style.setProperty('--color-primary-light', `color-mix(in srgb, ${color} 12%, white)`);
      document.documentElement.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${color} 85%, black)`);
    }
  }, []);

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      const { data } = await api.get<{ data: StoreSettings }>('/settings');
      if (data.data) {
        setSettings(data.data);
        if (data.data.primaryColor) {
          applyColors(data.data.primaryColor);
        }
      }
    } catch {
      /* keep defaults if no tenant is set yet */
    }
  }, [applyColors]);

  const refreshWithBroadcast = useCallback(async () => {
    await fetchSettings();
    if (typeof window !== 'undefined') {
      localStorage.setItem('store_settings_timestamp', Date.now().toString());
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'tenantId' ||
        e.key === 'token' ||
        e.key === 'store_settings_timestamp' ||
        e.key === 'store_primary_color'
      ) {
        fetchSettings();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchSettings]);

  const contextValue = useMemo<StoreContextValue>(() => ({
    ...settings,
    refresh: refreshWithBroadcast,
  }), [settings, refreshWithBroadcast]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

/** Returns a currency formatter bound to the store's currency and locale. */
export function useFmt() {
  const { currency, currencyLocale } = useStore();
  return (n: number) =>
    `${currency} ${n.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;
}
