export const PRICE_FIELDS = [
  'STARTER_MONTHLY_PRICE', 'PRO_MONTHLY_PRICE', 'ENTERPRISE_MONTHLY_PRICE',
  'STARTER_YEARLY_PRICE', 'PRO_YEARLY_PRICE', 'ENTERPRISE_YEARLY_PRICE',
  'EXTRA_SEAT_MONTHLY_PRICE', 'EXTRA_SEAT_YEARLY_PRICE',
];

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;
type FormatPriceFn = (value?: number) => string;

export function validateCatalogPricing<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(data.currencyCode) ||
      !data.prices || PRICE_FIELDS.some((key) =>
        typeof data.prices[key] !== 'number' || !Number.isFinite(data.prices[key]) || data.prices[key] < 0) ||
      !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) {
    throw new Error('Invalid or expired billing catalog response.');
  }
  return data;
}

export function translateCatalogPrice(
  t: TranslateFn,
  key: string,
  params: Record<string, unknown> | undefined,
  formatPrice: FormatPriceFn,
): string {
  if (!params || typeof params !== 'object') return t(key, params as unknown as Record<string, string | number>);
  const tokens: { marker: string; text: string }[] = [];
  const interpolation: Record<string, string | number> = { ...params } as Record<string, string | number>;
  for (const name of ['price', 'yearly', 'monthlyRate', 'annualRate']) {
    if (!(name in params)) continue;
    const match = String(params[name]).match(/^(\d+(?:\.\d+)?)(.*)$/);
    const marker = `__CATALOG_MONEY_${tokens.length}__`;
    tokens.push({ marker, text: match ? `${formatPrice(Number(match[1]))}${match[2]}` : formatPrice(undefined) });
    interpolation[name] = marker;
  }
  let text = t(key, interpolation);
  for (const { marker, text: formatted } of tokens) {
    // Locale files retain their interpolation structure; catalog currency replaces legacy symbols.
    text = text.replace(new RegExp(`(?:R\\$\\s*|[$\\u20ac\\u00a3]\\s*)?${marker}(?:\\s*[$\\u20ac\\u00a3])?`, 'g'),
      () => formatted);
  }
  return text;
}
