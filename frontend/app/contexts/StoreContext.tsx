'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  const fetchSettings = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    fetch(`${apiBase}/settings`)
      .then(r => r.json())
      .then(json => { if (json.data) setSettings(json.data); })
      .catch(() => { /* keep defaults */ });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
