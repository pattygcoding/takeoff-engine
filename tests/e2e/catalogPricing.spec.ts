import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { createCatalogFixture, formatMoney } from '../helpers/paddleCatalogFixture.ts';

// Prices come from a mocked Paddle catalog generated per run; expectations are derived from it.
const { prices } = createCatalogFixture().catalog;

async function mockApi(page: Page, { failInitially = false, user = null }: { failInitially?: boolean; user?: Record<string, unknown> | null } = {}) {
  let fail = failInitially;
  let lookups = 0;
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/billing/pricing')) {
      lookups += 1;
      return route.fulfill({
        status: fail ? 503 : 200,
        json: fail ? { code: 'PRICING_UNAVAILABLE', error: 'Pricing unavailable' } : {
          currencyCode: 'USD', prices,
          fetchedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        },
      });
    }
    if (path.endsWith('/auth/csrf-token')) return route.fulfill({ json: { csrfToken: 'test-csrf' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ status: user ? 200 : 401, json: { user } });
    return route.fulfill({ status: 404, json: { error: 'Unexpected test API call' } });
  });
  return { recover: () => { fail = false; }, lookups: () => lookups };
}

async function closeNotice(page: Page) {
  await page.locator('dialog button').last().click();
}

test('landing uses Paddle catalog amounts and currency with one shared request', async ({ page }) => {
  const api = await mockApi(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/home?lang=en');
  await closeNotice(page);
  const pricing = page.locator('#pricing');
  await expect(pricing).toContainText(formatMoney(prices.STARTER_MONTHLY_PRICE));
  await expect(pricing).toContainText(formatMoney(prices.STARTER_YEARLY_PRICE));
  await expect(pricing).toContainText(formatMoney(prices.EXTRA_SEAT_MONTHLY_PRICE));
  await expect(pricing.getByRole('button', { name: 'Choose Starter' })).toBeEnabled();
  await expect(page.locator('#comparison')).toContainText(formatMoney(prices.STARTER_MONTHLY_PRICE));
  expect(api.lookups()).toBe(1);
  expect(errors).toEqual([]);
});

test('catalog outage blocks paid choices and account creation but leaves free tools and login usable; retry recovers', async ({ page }) => {
  const api = await mockApi(page, { failInitially: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/home?lang=en');
  await closeNotice(page);
  const pricing = page.locator('#pricing');
  await expect(pricing.getByRole('alert')).toContainText('Pricing is temporarily unavailable');
  await expect(pricing.getByRole('button', { name: 'Choose Starter' })).toBeDisabled();
  await expect(pricing.getByRole('button', { name: 'Get Started Free' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start Free Trial (5 Free Takeoffs)' })).toBeDisabled();
  await expect(page.locator('#features').getByRole('alert'))
    .toContainText('Account creation is disabled because pricing is unavailable');
  await expect(page.locator('#calculator input').first()).toBeEnabled();
  await expect(pricing).not.toContainText('NaN');
  await expect(pricing).not.toContainText('{{price}}');
  api.recover();
  await pricing.getByRole('button', { name: 'Retry pricing' }).click();
  await expect(pricing.getByRole('button', { name: 'Choose Starter' })).toBeEnabled();
  await expect(pricing.getByRole('button', { name: 'Get Started Free' })).toBeEnabled();
  await expect(pricing).toContainText(formatMoney(prices.STARTER_MONTHLY_PRICE));
  expect(api.lookups()).toBe(2);
  await page.goto('/login?lang=en');
  await expect(page.locator('#login-identifier')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('create-account page disables submission and explains why while pricing is unavailable', async ({ page }) => {
  await mockApi(page, { failInitially: true });
  await page.goto('/register?lang=en');
  await expect(page.getByRole('alert'))
    .toContainText('Account creation is disabled because pricing is unavailable');
  await expect(page.locator('form').getByRole('button', { name: 'Create Account' })).toBeDisabled();
});

test('onboarding disables purchases during errors and uses full annual amounts after retry', async ({ page }) => {
  const api = await mockApi(page, {
    failInitially: true,
    user: { id: 'test-user', username: 'tester', role: 'user', subscription_tier: 'free', trial_uses_remaining: 5 },
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/onboarding?lang=en');
  await expect(page.getByRole('button', { name: 'Choose Starter' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Pricing is temporarily unavailable');
  api.recover();
  await page.getByRole('button', { name: 'Retry pricing' }).click();
  await expect(page.getByRole('button', { name: 'Choose Starter' })).toBeEnabled();
  await page.getByRole('button', { name: /Annual Billing/ }).click();
  await expect(page.locator('main')).toContainText(formatMoney(prices.STARTER_YEARLY_PRICE));
  await expect(page.locator('main')).toContainText(formatMoney(prices.ENTERPRISE_YEARLY_PRICE));
  await expect(page.locator('main')).toContainText(formatMoney(prices.EXTRA_SEAT_YEARLY_PRICE));
  expect(errors).toEqual([]);
});

for (const width of [390, 768, 1100, 1280]) {
  test(`prices and cadence stay together without column overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto('/home?lang=en');
    await closeNotice(page);
    const pricing = page.locator('#pricing');
    await expect(pricing).toContainText(formatMoney(prices.ENTERPRISE_MONTHLY_PRICE));
    const amounts = pricing.locator('[data-price-amount]');
    for (let index = 0; index < await amounts.count(); index += 1) {
      const amount = amounts.nth(index);
      const container = amount.locator('..');
      const cadence = container.locator('[data-price-cadence]');
      const amountBox = (await amount.boundingBox())!;
      const cadenceBox = (await cadence.boundingBox())!;
      expect(Math.abs((amountBox.y + amountBox.height) - (cadenceBox.y + cadenceBox.height))).toBeLessThan(12);
      expect(cadenceBox.x).toBeGreaterThanOrEqual(amountBox.x + amountBox.width);
      const fits = await container.evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
      expect(fits).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
