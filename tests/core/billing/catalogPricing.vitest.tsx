import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { billingApi } from '@/core/lib/billing/billing';
import { PRICE_FIELDS, translateCatalogPrice, validateCatalogPricing } from '@/core/lib/billing/catalogPricing';
import { getTranslation } from '@/core/lib/shared/i18n';
import { PricingProvider, PricingStatus, usePricingDisplay } from '@/core/components/context/PricingContext';
import { createCatalogFixture, formatMoney } from '../../helpers/paddleCatalogFixture.ts';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string, params: any) => getTranslation(key, params, 'en'), language: 'en' }),
}));

// Prices come from a mocked Paddle catalog generated per run; expectations are derived from it.
const fixture = createCatalogFixture();
const { prices } = fixture.catalog;

function catalog(overrides = {}) {
  return {
    ...fixture.catalog,
    prices: { ...prices },
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    ...overrides,
  };
}

function PricingHarness() {
  const { prices, t, ready, formatPrice } = usePricingDisplay();
  return (
    <>
      <p>Unrelated workspace</p>
      <PricingStatus />
      <div data-testid="translated">{t('core.landing.pricing.starter.price', { price: prices.STARTER_MONTHLY_PRICE })}</div>
      <div data-testid="seat-total">{formatPrice(prices.PRO_MONTHLY_PRICE + 2 * prices.EXTRA_SEAT_MONTHLY_PRICE)}</div>
      <button disabled={!ready}>Paid checkout</button>
      <button>Free access</button>
    </>
  );
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('catalog response validation', () => {
  it('accepts all configured numeric prices and their currency', () => {
    const data = catalog();
    expect(validateCatalogPricing(data)).toBe(data);
  });

  it.each(PRICE_FIELDS)('rejects missing %s', (key) => {
    const data = catalog();
    delete data.prices[key];
    expect(() => validateCatalogPricing(data)).toThrow();
  });

  it.each([NaN, Infinity, -1, String(prices.STARTER_MONTHLY_PRICE), null, undefined])('rejects invalid amount %s', (amount: any) => {
    const data = catalog();
    data.prices.STARTER_MONTHLY_PRICE = amount;
    expect(() => validateCatalogPricing(data)).toThrow();
  });

  it('rejects missing currency and expired responses', () => {
    expect(() => validateCatalogPricing(catalog({ currencyCode: '' }))).toThrow();
    expect(() => validateCatalogPricing(catalog({ expiresAt: new Date(Date.now() - 1).toISOString() }))).toThrow();
  });
});

describe('currency interpolation without modifying locale files', () => {
  const formatPrice = (value: any) => formatMoney(value);
  const price = prices.STARTER_MONTHLY_PRICE;
  const yearly = prices.STARTER_YEARLY_PRICE;

  it.each([
    ['${{price}}', () => formatMoney(price)],
    ['{{price}} €', () => formatMoney(price)],
    ['R$ {{price}}', () => formatMoney(price)],
    ['+{{price}} €/mo', () => `+${formatMoney(price)}/mo`],
    ['or ${{yearly}}/yr', () => `or ${formatMoney(yearly)}/yr`],
  ])('uses catalog currency in %s', (template, expected) => {
    const t = (_key: string, params: Record<string, any> = {}) =>
      template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => params[name]);
    expect(translateCatalogPrice(t, 'key', { price, yearly }, formatPrice)).toBe(expected());
  });

  it('keeps seat billing interval suffixes and HTML markup', () => {
    const seatYearly = prices.EXTRA_SEAT_YEARLY_PRICE;
    const seatMonthly = prices.EXTRA_SEAT_MONTHLY_PRICE;
    expect(translateCatalogPrice(getTranslation, 'core.upgradeModal.addExtraSeats', { price: `${seatYearly}/yr` }, formatPrice))
      .toContain(`${formatMoney(seatYearly)}/yr`);
    expect(translateCatalogPrice(getTranslation, 'core.teamWorkspaceManager.seatModalDescription', { price: seatMonthly }, formatPrice))
      .toContain(`<strong>+${formatMoney(seatMonthly)}/mo each (+ tax)</strong>`);
  });
});

describe('shared frontend pricing state', () => {
  it('shows loading, disables paid actions, and preserves free access', async () => {
    let resolve!: (value?: any) => void;
    vi.spyOn(billingApi, 'getPricing').mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<StrictMode><PricingProvider><PricingHarness /></PricingProvider></StrictMode>);
    expect(screen.getByRole('status').textContent).toContain('Loading pricing');
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Free access' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('Unrelated workspace')).toBeTruthy();
    expect(billingApi.getPricing).toHaveBeenCalledTimes(1);
    await act(async () => resolve(catalog()));
    expect(screen.getByTestId('translated').textContent).toBe(formatMoney(prices.STARTER_MONTHLY_PRICE));
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId('seat-total').textContent)
      .toBe(formatMoney(prices.PRO_MONTHLY_PRICE + 2 * prices.EXTRA_SEAT_MONTHLY_PRICE));
  });

  it('shows an explicit error and retries successfully without stale defaults', async () => {
    vi.spyOn(billingApi, 'getPricing')
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockResolvedValueOnce(catalog());
    render(<PricingProvider><PricingHarness /></PricingProvider>);
    expect((await screen.findByRole('alert')).textContent).toContain('Pricing is temporarily unavailable');
    expect(screen.getByTestId('translated').textContent).toBe('Pricing unavailable');
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry pricing' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(false));
    expect(billingApi.getPricing).toHaveBeenCalledTimes(2);
  });

  it('treats a malformed successful response as an error', async () => {
    vi.spyOn(billingApi, 'getPricing').mockResolvedValue({ prices: {} });
    render(<PricingProvider><PricingHarness /></PricingProvider>);
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('refreshes at expiry and drops expired prices when refresh fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(billingApi, 'getPricing')
      .mockResolvedValueOnce(catalog())
      .mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => render(<PricingProvider><PricingHarness /></PricingProvider>));
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('translated').textContent).toBe('Pricing unavailable');
    expect((screen.getByRole('button', { name: 'Paid checkout' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('pricing API client', () => {
  it('uses the public pricing endpoint and returns its response', async () => {
    const data = catalog();
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetch);
    expect(await billingApi.getPricing()).toEqual(data);
    expect(fetch.mock.calls[0][0]).toMatch(/\/billing\/pricing$/);
    expect(fetch.mock.calls[0][1].method).toBe('GET');
  });

  it('rejects non-success responses and does not return fallback amounts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(billingApi.getPricing()).rejects.toThrow('Pricing is temporarily unavailable');
  });

  it('aborts an unresponsive pricing request after ten seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    const result = expect(billingApi.getPricing()).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
  });
});
