import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { billingApi } from '@/core/lib/billing/billing';
import { translateCatalogPrice, validateCatalogPricing } from '@/core/lib/billing/catalogPricing';
import { useTranslation } from '@/core/components/context/I18nContext';
import { readPrerenderPricing, type PrerenderPricingCatalog } from '@/core/lib/shared/prerender';
import type { TranslationParamsInput } from '@/core/lib/shared/i18n';

interface PricingCatalog {
  currencyCode: string;
  prices: Record<string, number>;
  expiresAt: string;
}

interface PricingState {
  catalog: PricingCatalog | null;
  loading: boolean;
  error: boolean;
}

interface PricingContextValue extends PricingState {
  retry: () => void;
}

const PricingContext = createContext<PricingContextValue | null>(null);

/** Catalog inlined by the prerender script; null on client-rendered (non-prerendered) pages. */
const prerenderedCatalog = readPrerenderPricing();

/** setTimeout delays above the 32-bit ceiling fire immediately, so clamp before scheduling. */
const MAX_TIMEOUT_MS = 2_147_483_647;

function refreshDelayMs(expiresAt: string): number {
  return Math.min(Math.max(0, Date.parse(expiresAt) - Date.now()), MAX_TIMEOUT_MS);
}

export function PricingProvider({ children }: Readonly<{ children: ReactNode }>) {
  // Trusting the inlined catalog keeps the first client render identical to the prerendered HTML.
  // Refetching on mount would flip to a loading state and break hydration, so a refresh is
  // scheduled for the catalog's expiry instead.
  const [state, setState] = useState<PricingState>(() =>
    prerenderedCatalog
      ? { catalog: prerenderedCatalog, loading: false, error: false }
      : { catalog: null, loading: true, error: false }
  );
  const [revision, setRevision] = useState(0);
  const pending = useRef<Promise<PricingCatalog> | null>(null);
  const seededCatalog = useRef<PrerenderPricingCatalog | null>(prerenderedCatalog);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const seeded = seededCatalog.current;
    if (seeded) {
      seededCatalog.current = null;
      refreshTimer = setTimeout(retry, refreshDelayMs(seeded.expiresAt));
      return () => {
        active = false;
        clearTimeout(refreshTimer);
      };
    }

    setState({ catalog: null, loading: true, error: false });
    if (!pending.current) {
      const request = billingApi.getPricing().then(validateCatalogPricing);
      pending.current = request;
      request.then(
        () => { if (pending.current === request) pending.current = null; },
        () => { if (pending.current === request) pending.current = null; },
      );
    }
    pending.current!.then(
      (catalog) => {
        if (!active) return;
        setState({ catalog, loading: false, error: false });
        refreshTimer = setTimeout(retry, refreshDelayMs(catalog.expiresAt));
      },
      (error) => {
        if (!active) return;
        console.error('[Pricing catalog]', error.message);
        setState({ catalog: null, loading: false, error: true });
      },
    );
    return () => {
      active = false;
      clearTimeout(refreshTimer);
    };
  }, [revision, retry]);

  const value = useMemo(() => ({ ...state, retry }), [state, retry]);

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): PricingContextValue {
  const context = useContext(PricingContext);
  if (!context) throw new Error('PricingProvider is required.');
  return context;
}

export function usePricingDisplay() {
  const { catalog, loading, error } = usePricing();
  const { t, language } = useTranslation();
  const formatPrice = (amount?: number): string => {
    if (!catalog || typeof amount !== 'number' || !Number.isFinite(amount)) {
      return t(loading ? 'core.catalogPricing.loading' : 'core.catalogPricing.unavailableShort');
    }
    return new Intl.NumberFormat(language, {
      style: 'currency', currency: catalog.currencyCode, currencyDisplay: 'symbol',
    }).format(amount);
  };
  return {
    prices: catalog?.prices || {},
    ready: Boolean(catalog) && !error && !loading,
    formatPrice,
    t: (key: string, params?: TranslationParamsInput) =>
      translateCatalogPrice(t, key, typeof params === 'object' ? params : undefined, formatPrice),
  };
}

export function PricingStatus() {
  const { catalog, loading, error, retry } = usePricing();
  const { t } = useTranslation();
  if (loading) return <output className="p-3 text-sm block">{t('core.catalogPricing.loading')}</output>;
  if (error) {
    return (
      <div role="alert" className="p-3 text-sm border border-red-500 rounded-lg">
        <p>{t('core.catalogPricing.unavailable')}</p>
        <button type="button" onClick={retry} className="mt-2 underline cursor-pointer">
          {t('core.catalogPricing.retry')}
        </button>
      </div>
    );
  }
  return <p className="p-3 text-xs">{t('core.catalogPricing.catalogNotice', { currency: catalog?.currencyCode ?? '' })}</p>;
}

/** Sign-up stays closed while the catalog is unavailable; the backend enforces the same rule. */
export function useAccountCreationDisabled() {
  const { loading, error } = usePricing();
  return Boolean(error) && !loading;
}

export function AccountCreationDisabledNotice({ className = '' }: Readonly<{ className?: string }>) {
  const { retry } = usePricing();
  const disabled = useAccountCreationDisabled();
  const { t } = useTranslation();
  if (!disabled) return null;
  return (
    <div role="alert" className={`p-3 text-sm border border-red-500 rounded-lg ${className}`}>
      <p>{t('core.catalogPricing.accountCreationDisabled')}</p>
      <button type="button" onClick={retry} className="mt-2 underline cursor-pointer">
        {t('core.catalogPricing.retry')}
      </button>
    </div>
  );
}
