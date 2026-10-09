// Tests never hardcode plan prices. Each run mocks the Paddle catalog with freshly
// generated amounts and derives every expected value from them.

export const CATALOG_PRICE_NAMES = [
  'STARTER_MONTHLY_PRICE',
  'PRO_MONTHLY_PRICE',
  'ENTERPRISE_MONTHLY_PRICE',
  'STARTER_YEARLY_PRICE',
  'PRO_YEARLY_PRICE',
  'ENTERPRISE_YEARLY_PRICE',
  'EXTRA_SEAT_MONTHLY_PRICE',
  'EXTRA_SEAT_YEARLY_PRICE',
];

export function randomMinorUnits() {
  return 100 + Math.floor(Math.random() * 99_900);
}

/**
 * A catalog shaped like the backend `GET /api/billing/pricing` response, plus generated minor units.
 */
export function createCatalogFixture({ currencyCode = 'USD', expiresInMs = 300_000 } = {}) {
  const minorUnits = Object.fromEntries(CATALOG_PRICE_NAMES.map((name) => [name, randomMinorUnits()]));
  const prices = Object.fromEntries(Object.entries(minorUnits).map(([name, minor]) => [name, minor / 100]));
  const now = Date.now();
  return {
    minorUnits,
    catalog: {
      currencyCode,
      prices,
      fetchedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + expiresInMs).toISOString(),
    },
  };
}

export function formatMoney(amount: number, currencyCode = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
}

export function toMinor(amount: number) {
  return Math.round(amount * 100);
}
