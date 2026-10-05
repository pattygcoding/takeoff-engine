import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { billingApi } from '@/core/lib/billing/billing';
import { translateCatalogPrice, validateCatalogPricing } from '@/core/lib/billing/catalogPricing';
import { useTranslation } from '@/core/components/context/I18nContext';

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  const [state, setState] = useState({ catalog: null, loading: true, error: false });
  const [revision, setRevision] = useState(0);
  const pending = useRef(null);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let refreshTimer;
    setState({ catalog: null, loading: true, error: false });
    if (!pending.current) {
      const request = billingApi.getPricing().then(validateCatalogPricing);
      pending.current = request;
      request.then(
        () => { if (pending.current === request) pending.current = null; },
        () => { if (pending.current === request) pending.current = null; },
      );
    }
    pending.current.then(
      (catalog) => {
        if (!active) return;
        setState({ catalog, loading: false, error: false });
        refreshTimer = setTimeout(retry, Math.max(0, Date.parse(catalog.expiresAt) - Date.now()));
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

  return <PricingContext.Provider value={{ ...state, retry }}>{children}</PricingContext.Provider>;
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (!context) throw new Error('PricingProvider is required.');
  return context;
}

export function usePricingDisplay() {
  const { catalog, loading, error } = usePricing();
  const { t, language } = useTranslation();
  const formatPrice = (amount) => {
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
    t: (key, params) => translateCatalogPrice(t, key, params, formatPrice),
  };
}

export function PricingStatus() {
  const { catalog, loading, error, retry } = usePricing();
  const { t } = useTranslation();
  if (loading) return <p role="status" className="p-3 text-sm">{t('core.catalogPricing.loading')}</p>;
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
  return <p className="p-3 text-xs">{t('core.catalogPricing.catalogNotice', { currency: catalog.currencyCode })}</p>;
}

/** Sign-up stays closed while the catalog is unavailable; the backend enforces the same rule. */
export function useAccountCreationDisabled() {
  const { loading, error } = usePricing();
  return Boolean(error) && !loading;
}

export function AccountCreationDisabledNotice({ className = '' }) {
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
