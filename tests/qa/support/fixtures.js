import fs from 'node:fs';
import { expect, test as base } from '@playwright/test';
import { findAuthUserByEmail, findProfile, openDatabase } from './database.js';
import { createPaddleSandboxApi, deliverPaddleWebhook, payWithPaddleOverlay } from './paddleSandbox.js';
import { createQaIdentity, loadQaSettings } from './qaEnvironment.js';

// UI labels come from the English locale so copy changes don't silently break selectors.
const en = JSON.parse(fs.readFileSync(new URL('../../../src/lang/en.json', import.meta.url), 'utf8'));
export const label = (key) => {
  const value = key.split('.').reduce((node, part) => node?.[part], en);
  if (typeof value !== 'string') throw new Error(`Missing English label "${key}".`);
  return value;
};

export const PLAN_CTA_KEYS = {
  starter: 'core.landing.pricing.starter.cta',
  pro: 'core.landing.pricing.pro.cta',
  enterprise: 'core.landing.pricing.enterprise.cta',
};

export const test = base.extend({
  /** Browser console output is attached to failed tests; checkout problems often only log there. */
  browserLog: [async ({ page }, provide, testInfo) => {
    const lines = [];
    page.on('console', (message) => lines.push(`[${message.type()}] ${message.text()}`));
    page.on('pageerror', (error) => lines.push(`[pageerror] ${error.message}`));
    await provide(lines);
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('browser-console', { body: lines.join('\n'), contentType: 'text/plain' });
    }
  }, { auto: true }],

  /** Short label embedded in the QA customer's username/email, e.g. "pro". */
  customerLabel: ['customer', { option: true }],

  // eslint-disable-next-line no-empty-pattern
  settings: async ({}, provide) => provide(loadQaSettings()),

  // eslint-disable-next-line no-empty-pattern
  db: async ({}, provide) => {
    const db = await openDatabase(process.env.DATABASE_URL);
    await provide(db);
    await db.end().catch(() => {});
  },

  /** A brand-new customer whose browser traffic to the API comes from their own client IP. */
  customer: async ({ page, settings, customerLabel }, provide) => {
    const customer = createQaIdentity(customerLabel, { emailTemplate: settings.emailTemplate });
    await page.route(`${settings.apiUrl}/**`, (route) => route.continue({
      headers: { ...route.request().headers(), 'x-forwarded-for': customer.clientIp },
    }));
    await provide(customer);
  },
});

export { expect };

/** Sign up through the public registration form, exactly like a visitor. */
export async function registerThroughUi(page, customer) {
  await page.goto('/register?lang=en');
  const form = page.locator('form').filter({ has: page.locator('#register-email') });
  await form.locator('#register-first-name').fill(customer.firstName);
  await form.locator('#register-last-name').fill(customer.lastName);
  await form.locator('#register-username').fill(customer.username);
  await form.locator('#register-email').fill(customer.email);
  await form.locator('#register-phone').fill(customer.phone);
  await form.locator('#register-password').fill(customer.password);
  await form.getByRole('checkbox').check();

  const registration = page.waitForResponse((res) => res.url().endsWith('/auth/register') && res.request().method() === 'POST');
  await form.getByRole('button', { name: label('core.loginPage.createAccount'), exact: true }).click();
  const response = await registration;
  expect(response.status(), `registration failed: ${await response.text()}`).toBe(201);

  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('status')).toContainText(/verify your email/i);
  return response.json();
}

/**
 * The customer clicks the link in their verification email. The QA gateway kept the token that
 * email would have carried; it is redeemed at Supabase's real /verify endpoint.
 */
export async function verifyEmail(db, customer, settings) {
  const authUser = await findAuthUserByEmail(db, customer.email);
  expect(authUser, `no auth user was created for ${customer.email}`).toBeTruthy();
  expect(authUser.email_confirmed_at, 'new accounts must start unverified').toBeNull();

  const tokenRes = await fetch(`${settings.supabaseGatewayUrl}/__qa/verification-token?email=${encodeURIComponent(customer.email)}`);
  expect(tokenRes.ok, 'the signup produced no verification token').toBeTruthy();
  const { tokenHash } = await tokenRes.json();

  const verifyRes = await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'signup', token_hash: tokenHash }),
  });
  expect(verifyRes.ok, `email verification failed: ${await verifyRes.text()}`).toBeTruthy();

  const verified = await findAuthUserByEmail(db, customer.email);
  expect(verified.email_confirmed_at, 'email should be confirmed after verification').toBeTruthy();
  return verified;
}

export async function loginThroughUi(page, customer) {
  await page.goto('/login?lang=en');
  const form = page.locator('form').filter({ has: page.locator('#login-identifier') });
  await form.locator('#login-identifier').fill(customer.email);
  await form.locator('#login-password').fill(customer.password);
  await form.getByRole('button', { name: label('core.loginPage.logIn'), exact: true }).click();
  // Signed-in customers are taken to their own workspace route.
  await page.waitForURL(new RegExp(`/${customer.username}(\\?|$)`));
}

/** Registration -> email verification -> first login. Returns the auth user. */
export async function createVerifiedAccount(page, db, customer, settings) {
  await registerThroughUi(page, customer);
  const authUser = await verifyEmail(db, customer, settings);
  await loginThroughUi(page, customer);
  return authUser;
}

export async function getJson(page, url) {
  const res = await page.request.get(url);
  expect(res.ok(), `GET ${url} -> ${res.status()}`).toBeTruthy();
  return res.json();
}

/** Poll the profile row until a predicate holds (some writes are asynchronous). */
export async function expectProfile(db, userId, predicate, message) {
  let profile = null;
  await expect.poll(async () => {
    profile = await findProfile(db, userId);
    return Boolean(profile && predicate(profile));
  }, { message, timeout: 20_000 }).toBe(true);
  return profile;
}

export async function baseSeatsFor(db, tier) {
  const { rows: [row] } = await db.query('SELECT base_seats FROM public.subscription_tier_limits WHERE tier = $1', [tier]);
  return row?.base_seats ?? null;
}

/**
 * Choose a paid plan on the core plan picker and pay in the Paddle sandbox overlay. Then deliver
 * Paddle's resulting subscription to the app's webhook, the path that grants entitlements.
 */
export async function purchasePlanThroughUi(page, { plan, customer, settings }) {
  await page.goto('/onboarding?lang=en');
  const choosePlan = page.getByRole('button', { name: label(PLAN_CTA_KEYS[plan]), exact: true });
  await expect(choosePlan).toBeEnabled({ timeout: 30_000 });
  await choosePlan.click();

  await payWithPaddleOverlay(page, {
    email: customer.email,
    cardholderName: `${customer.firstName} ${customer.lastName}`,
    card: settings.card,
  });

  const paddle = createPaddleSandboxApi({ baseUrl: settings.paddle.apiBaseUrl });
  const priceId = settings.paddle.priceIds[plan];
  const subscription = await paddle.waitForSubscription({ email: customer.email, priceId });
  // Let the app's own post-checkout handling settle before the harness navigates anywhere.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  await deliverPaddleWebhook({
    backendUrl: settings.backendInternalUrl,
    secret: settings.paddle.webhookSecret,
    eventType: 'subscription.created',
    data: await paddle.getSubscription(subscription.id),
  });
  return subscription;
}
