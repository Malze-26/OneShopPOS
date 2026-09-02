'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // Uses the Axios instance so the OneShop-Tenant-ID header is automatically
  // included when a tenant has been selected (stored in localStorage).
  const fetchSettings = (): Promise<void> => {
    return api.get<{ data: StoreSettings }>('/settings')
      .then(({ data }) => { if (data.data) setSettings(data.data); })
      .catch(() => { /* keep defaults if no tenant is set yet */ });
  };

  useEffect(() => {
    fetchSettings();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tenantId' || e.key === 'token') {
        fetchSettings();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Update CSS variable for primary color whenever it changes
  useEffect(() => {
    if (typeof document !== 'undefined' && settings.primaryColor) {
      const color = '#' + settings.primaryColor.replace(/^#+/, '');
      document.documentElement.style.setProperty('--color-primary', color);
      document.documentElement.style.setProperty('--primary', color);
      document.documentElement.style.setProperty('--color-primary-light', `color-mix(in srgb, ${color} 12%, white)`);
      document.documentElement.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${color} 85%, black)`);
    }
  }, [settings.primaryColor]);

  return (
    <StoreContext.Provider value={{ ...settings, refresh: fetchSettings }}>
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
