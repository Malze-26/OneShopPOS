'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Package, Users, Truck, ShoppingBag, X } from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const PER_GROUP_LIMIT = 5;

type ResultGroup = 'products' | 'customers' | 'suppliers' | 'orders';

interface SearchResult {
  group: ResultGroup;
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
}

const groupConfig: Record<ResultGroup, { label: string; icon: typeof Package }> = {
  products:  { label: 'Products',  icon: Package },
  customers: { label: 'Customers', icon: Users },
  suppliers: { label: 'Suppliers', icon: Truck },
  orders:    { label: 'Orders',    icon: ShoppingBag },
};

type ProductRow  = { _id: string; name: string; sku?: string; sellingPrice?: number };
type CustomerRow = { _id: string; name: string; email?: string; phone?: string };
type SupplierRow = { _id: string; name: string; contactPerson?: string; email?: string };
type OrderRow    = { _id: string; orderId?: string; customerName?: string; total?: number };

/** Global header search — fans out to the entity endpoints and shows grouped results. */
export function GlobalSearch() {
  const router = useRouter();
  const { currency, currencyLocale } = useStore();
  // Memoised so it is a stable effect dependency — useFmt() returns a new fn each render,
  // which would reset the debounce timer on every re-render.
  const fmt = useCallback(
    (n: number) => `${currency} ${n.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`,
    [currency, currencyLocale]
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against out-of-order responses from slower earlier queries.
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_QUERY_LENGTH;

  // ── Fetch results (debounced) ───────────────────────────────────────────────
  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      const params = { search: trimmed };
      const settled = await Promise.allSettled([
        api.get('/products',  { params, signal: controller.signal }),
        api.get('/customers', { params, signal: controller.signal }),
        api.get('/suppliers', { params, signal: controller.signal }),
        api.get('/orders',    { params: { ...params, limit: PER_GROUP_LIMIT }, signal: controller.signal }),
      ]);

      if (controller.signal.aborted || requestId !== requestIdRef.current) return;

      function rows<T>(i: number): T[] {
        const r = settled[i];
        if (r.status !== 'fulfilled') return [];
        return (r.value.data?.data ?? []) as T[];
      }

      const next: SearchResult[] = [
        ...rows<ProductRow>(0).slice(0, PER_GROUP_LIMIT).map((p) => ({
          group: 'products' as const,
          id: p._id,
          title: p.name,
          subtitle: p.sku ? `SKU ${p.sku}` : 'Product',
          meta: p.sellingPrice != null ? fmt(p.sellingPrice) : undefined,
          href: `/products/${p._id}`,
        })),
        ...rows<CustomerRow>(1).slice(0, PER_GROUP_LIMIT).map((c) => ({
          group: 'customers' as const,
          id: c._id,
          title: c.name,
          subtitle: c.email || c.phone || 'Customer',
          href: `/customers?search=${encodeURIComponent(c.name)}`,
        })),
        ...rows<SupplierRow>(2).slice(0, PER_GROUP_LIMIT).map((s) => ({
          group: 'suppliers' as const,
          id: s._id,
          title: s.name,
          subtitle: s.contactPerson || s.email || 'Supplier',
          href: `/suppliers?search=${encodeURIComponent(s.name)}`,
        })),
        ...rows<OrderRow>(3).slice(0, PER_GROUP_LIMIT).map((o) => ({
          group: 'orders' as const,
          id: o._id,
          title: o.orderId || o._id,
          subtitle: o.customerName || 'Order',
          meta: o.total != null ? fmt(o.total) : undefined,
          href: `/orders?search=${encodeURIComponent(o.customerName || '')}`,
        })),
      ];

      setResults(next);
      setActiveIndex(-1);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, canSearch, fmt]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // ── Ctrl/Cmd+K focuses the search ───────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const grouped = useMemo(() => {
    const order: ResultGroup[] = ['products', 'customers', 'suppliers', 'orders'];
    return order
      .map((g) => ({ group: g, items: results.filter((r) => r.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  const go = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    inputRef.current?.blur();
    router.push(result.href);
  }, [router]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!results.length) return;
      e.preventDefault();
      setOpen(true);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i + delta + results.length) % results.length);
      return;
    }
    if (e.key === 'Enter') {
      const target = results[activeIndex] ?? results[0];
      if (target) {
        e.preventDefault();
        go(target);
      }
    }
  }

  function clear() {
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  const showPanel = open && canSearch;
  // Flat index across groups so arrow-key highlighting matches render order.
  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5565] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search anything..."
        aria-label="Search products, customers, suppliers and orders"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        autoComplete="off"
        className="w-[280px] pl-10 pr-9 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-white"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#4a5565] hover:text-[#101828] rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[420px] overflow-y-auto bg-white rounded-lg shadow-lg border border-[#e4e7ec] py-2 z-30"
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#4a5565]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </div>
          )}

          {!loading && grouped.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[#4a5565]">
              No results found
            </div>
          )}

          {!loading && grouped.map(({ group, items }) => {
            const { label, icon: Icon } = groupConfig[group];
            return (
              <div key={group}>
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[#4a5565]">
                  {label}
                </div>
                {items.map((item) => {
                  flatIndex += 1;
                  const myIndex = flatIndex;
                  const isActive = myIndex === activeIndex;
                  return (
                    <button
                      key={`${group}-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(myIndex)}
                      onClick={() => go(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#101828] truncate">{item.title}</p>
                        <p className="text-xs text-[#4a5565] truncate">{item.subtitle}</p>
                      </div>
                      {item.meta && (
                        <span className="text-xs font-medium text-[#101828] shrink-0">{item.meta}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
