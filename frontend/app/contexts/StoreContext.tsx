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
};

interface StoreContextValue extends StoreSettings {
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue>({ ...defaults, refresh: () => {} });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaults);

  // Uses the Axios instance so the OneShop-Tenant-ID header is automatically
  // included when a tenant has been selected (stored in localStorage).
  const fetchSettings = () => {
    api.get<{ data: StoreSettings }>('/settings')
      .then(({ data }) => { if (data.data) setSettings(data.data); })
      .catch(() => { /* keep defaults if no tenant is set yet */ });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update CSS variable for primary color whenever it changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
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
