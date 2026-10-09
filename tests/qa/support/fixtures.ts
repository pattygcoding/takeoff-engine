import fs from 'node:fs';
import { expect, test as base } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { findAuthUserByEmail, findProfile, openDatabase } from './database.ts';
import type { Db } from './database.ts';
import { createPaddleSandboxApi, deliverPaddleWebhook, payWithPaddleOverlay } from './paddleSandbox.ts';
import type { PaddleSandboxApi } from './paddleSandbox.ts';
import { createQaIdentity, loadQaSettings } from './qaEnvironment.ts';
import type { QaIdentity, QaSettings } from './qaEnvironment.ts';
import { createSupabaseAdmin } from './supabaseAdmin.ts';

/** A secondary person in a scenario, living in its own browser context. */
export interface QaPersona {
  context: BrowserContext;
  page: Page;
  customer: QaIdentity;
  authUser: Record<string, any> | null;
}

export type PersonaFactory = (
  personaLabel: string,
  options?: { signUp?: boolean; verification?: 'link' | 'admin' },
) => Promise<QaPersona>;

/** Custom fixtures this suite adds on top of Playwright's defaults. */
interface QaFixtures {
  /** Browser console output, attached to failed tests. */
  browserLog: string[];
  /** Short label embedded in the QA customer's username/email, e.g. "pro". */
  customerLabel: string;
  settings: QaSettings;
  db: Db;
  customer: QaIdentity;
  persona: PersonaFactory;
}

// UI labels come from the English locale so copy changes don't silently break selectors.
const en = JSON.parse(fs.readFileSync(new URL('../../../src/lang/en.json', import.meta.url), 'utf8'));
export const label = (key: string): string => {
  const value = key.split('.').reduce((node: any, part) => node?.[part], en as any);
  if (typeof value !== 'string') throw new Error(`Missing English label "${key}".`);
  return value;
};

export const PLAN_CTA_KEYS: Record<string, string> = {
  starter: 'core.landing.pricing.starter.cta',
  pro: 'core.landing.pricing.pro.cta',
  enterprise: 'core.landing.pricing.enterprise.cta',
};

export const test = base.extend<QaFixtures>({
  /** Browser console output is attached to failed tests; checkout problems often only log there. */
  browserLog: [async ({ page }, provide, testInfo) => {
    const lines: string[] = [];
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
    const db = await openDatabase(process.env.DATABASE_URL ?? '');
    await provide(db);
    await db.end().catch(() => {});
  },

  /** A brand-new customer whose browser traffic to the API comes from their own client IP. */
  customer: async ({ page, settings, customerLabel }, provide) => {
    const customer = createQaIdentity(customerLabel, { emailTemplate: settings.emailTemplate });
    await routeAsClient(page, settings, customer);
    await provide(customer);
  },

  /**
   * Factory for additional people in a scenario (team members, outsiders). Each gets a brand-new
   * QA identity in its own browser context (separate cookies/session) and client IP.
   *   const admin = await persona('admin');             // signed up, verified, and logged in
   *   const invitee = await persona('new', { signUp: false });
   */
  persona: async ({ browser, db, settings }, provide, testInfo) => {
    const contexts: BrowserContext[] = [];
    await provide(async (
      personaLabel: string,
      { signUp = true, verification = 'admin' }: { signUp?: boolean; verification?: 'link' | 'admin' } = {},
    ) => {
      const context = await browser.newContext({
        baseURL: settings.frontendUrl,
        viewport: { width: 1440, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      contexts.push(context);
      const page = await context.newPage();
      const customer = createQaIdentity(personaLabel, { emailTemplate: settings.emailTemplate });
      await routeAsClient(page, settings, customer);
      const authUser = signUp ? await createVerifiedAccount(page, db, customer, settings, { verification }) : null;
      return { context, page, customer, authUser };
    });
    if (testInfo.status !== testInfo.expectedStatus) {
      for (const [index, context] of contexts.entries()) {
        for (const page of context.pages()) {
          await testInfo.attach(`persona-${index + 1}`, { body: await page.screenshot().catch(() => Buffer.alloc(0)), contentType: 'image/png' });
        }
      }
    }
    for (const context of contexts) await context.close().catch(() => {});
  },
});

async function routeAsClient(page: Page, settings: QaSettings, customer: QaIdentity): Promise<void> {
  await page.route(`${settings.apiUrl}/**`, (route) => route.continue({
    headers: { ...route.request().headers(), 'x-forwarded-for': customer.clientIp },
  }));
}

export { expect };

/** Sign up through the public registration form, exactly like a visitor. */
export async function registerThroughUi(page: Page, customer: QaIdentity): Promise<any> {
  await page.goto('/register?lang=en');
  const form = page.locator('form').filter({ has: page.locator('#register-email') });
  await form.locator('#register-first-name').fill(customer.firstName);
  await form.locator('#register-last-name').fill(customer.lastName);
  await form.locator('#register-username').fill(customer.username);
  await form.locator('#register-email').fill(customer.email);
  await form.locator('#register-phone').fill(customer.phone);
  await form.locator('#register-password').fill(customer.password);
  // Two required consents: the 18+ age attestation and the Terms/Privacy acceptance.
  await form.locator('#register-age-confirmation').check();
  await form.locator('#register-accept-terms').check();

  const registration = page.waitForResponse((res) => res.url().endsWith('/auth/register') && res.request().method() === 'POST');
  await form.getByRole('button', { name: label('core.loginPage.createAccount'), exact: true }).click();
  const response = await registration;
  expect(response.status(), `registration failed: ${await response.text()}`).toBe(201);

  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('status')).toContainText(/verify your email/i);
  return response.json();
}

/**
 * The customer verifies their email address.
 *  - 'link' (default for signup-focused tests): the QA gateway kept the token the verification
 *    email would have carried; it is redeemed at Supabase's real /verify endpoint.
 *  - 'admin': setup accounts are confirmed through the Auth Admin API, which keeps large
 *    multi-account scenarios clear of Supabase's per-IP verification rate limit.
 */
export async function verifyEmail(
  db: Db,
  customer: QaIdentity,
  settings: QaSettings,
  { method = 'link' }: { method?: 'link' | 'admin' } = {},
): Promise<Record<string, any>> {
  const authUser = await findAuthUserByEmail(db, customer.email);
  expect(authUser, `no auth user was created for ${customer.email}`).toBeTruthy();
  expect(authUser!.email_confirmed_at, 'new accounts must start unverified').toBeNull();

  if (method === 'admin') {
    await createSupabaseAdmin().confirmEmail(authUser!.id);
  } else {
    const tokenRes = await fetch(`${settings.supabaseGatewayUrl}/__qa/verification-token?email=${encodeURIComponent(customer.email)}`);
    expect(tokenRes.ok, 'the signup produced no verification token').toBeTruthy();
    const { tokenHash } = await tokenRes.json();

    const verifyRes = await withRateLimitRetry(() => fetch(`${(process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signup', token_hash: tokenHash }),
    }));
    expect(verifyRes.ok, `email verification failed: ${await verifyRes.text()}`).toBeTruthy();
  }

  const verified = (await findAuthUserByEmail(db, customer.email))!;
  expect(verified.email_confirmed_at, 'email should be confirmed after verification').toBeTruthy();
  return verified;
}

/** Waits out Supabase's per-IP auth rate limit (HTTP 429) instead of failing the test. */
async function withRateLimitRetry(
  send: () => Promise<Response>,
  { timeoutMs = 120_000 }: { timeoutMs?: number } = {},
): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let response = await send();
  while (response.status === 429 && Date.now() < deadline) {
    const retryAfter = Number(response.headers.get('retry-after')) || 10;
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 15) * 1000));
    response = await send();
  }
  return response;
}

/** Fill in and submit the login form; where the user lands depends on the scenario. */
export async function submitLoginForm(page: Page, customer: QaIdentity): Promise<void> {
  const form = page.locator('form').filter({ has: page.locator('#login-identifier') });
  await form.locator('#login-identifier').fill(customer.email);
  await form.locator('#login-password').fill(customer.password);
  await form.getByRole('button', { name: label('core.loginPage.logIn'), exact: true }).click();
}

export async function loginThroughUi(page: Page, customer: QaIdentity): Promise<void> {
  await page.goto('/login?lang=en');
  await submitLoginForm(page, customer);
  // Signed-in customers are taken to their own workspace route.
  await page.waitForURL(new RegExp(`/${customer.username}(\\?|$)`));
}

/** Registration -> email verification -> first login. Returns the auth user. */
export async function createVerifiedAccount(
  page: Page,
  db: Db,
  customer: QaIdentity,
  settings: QaSettings,
  { verification = 'admin' }: { verification?: 'link' | 'admin' } = {},
): Promise<Record<string, any>> {
  await registerThroughUi(page, customer);
  const authUser = await verifyEmail(db, customer, settings, { method: verification });
  await loginThroughUi(page, customer);
  return authUser;
}

/**
 * Call the API as the user signed in on `page` (session cookie + the CSRF token the app keeps in
 * sessionStorage). Returns { status, body } and never throws on HTTP errors.
 */
export async function apiAs(
  page: Page,
  settings: QaSettings,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const csrfToken = await page.evaluate(() => sessionStorage.getItem('takeoff_csrf'));
  const res = await page.request.fetch(`${settings.apiUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
    data: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

export async function getJson(page: Page, url: string): Promise<any> {
  const res = await page.request.get(url);
  expect(res.ok(), `GET ${url} -> ${res.status()}`).toBeTruthy();
  return res.json();
}

/** Poll the profile row until a predicate holds (some writes are asynchronous). */
export async function expectProfile(
  db: Db,
  userId: string,
  predicate: (profile: Record<string, any>) => boolean,
  message: string,
): Promise<Record<string, any>> {
  let profile: Record<string, any> | null = null;
  await expect.poll(async () => {
    profile = await findProfile(db, userId);
    return Boolean(profile && predicate(profile));
  }, { message, timeout: 20_000 }).toBe(true);
  return profile as unknown as Record<string, any>;
}

export async function baseSeatsFor(db: Db, tier: string): Promise<number | null> {
  const { rows: [row] } = await db.query('SELECT base_seats FROM public.subscription_tier_limits WHERE tier = $1', [tier]);
  return row?.base_seats ?? null;
}

export const paddleApi = (settings: QaSettings): PaddleSandboxApi =>
  createPaddleSandboxApi({ baseUrl: settings.paddle.apiBaseUrl });

/**
 * Deliver Paddle's current state of a subscription to the app's webhook, as Paddle would after
 * any change (created, updated, canceled, ...). `overrides` simulates states the sandbox cannot
 * produce on demand (e.g. a failed renewal payment). Returns the subscription that was delivered.
 */
export async function forwardSubscriptionWebhook(
  settings: QaSettings,
  subscriptionId: string,
  eventType: string,
  overrides: Record<string, any> | null = null,
): Promise<any> {
  const current = await paddleApi(settings).getSubscription(subscriptionId);
  const data = overrides ? { ...current, ...overrides, updated_at: new Date().toISOString() } : current;
  await deliverPaddleWebhook({
    backendUrl: settings.backendInternalUrl,
    secret: settings.paddle.webhookSecret,
    eventType,
    data,
  });
  return data;
}

/**
 * Paddle notifies the app when a subscription renews, but a real renewal is a billing cycle away
 * and the sandbox cannot fast-forward time. This delivers the renewal notification Paddle would
 * send: the real subscription with its billing period advanced by one cycle. Only the clock is
 * simulated; items, prices, and the account link come from Paddle.
 */
export async function forwardRenewalWebhook(settings: QaSettings, subscriptionId: string): Promise<any> {
  const data = await paddleApi(settings).getSubscription(subscriptionId);
  const startsAt = new Date(data.next_billed_at || data.current_billing_period.ends_at);
  const endsAt = new Date(startsAt);
  if (data.billing_cycle?.interval === 'year') endsAt.setUTCFullYear(endsAt.getUTCFullYear() + 1);
  else endsAt.setUTCMonth(endsAt.getUTCMonth() + 1);

  const renewed = {
    ...data,
    current_billing_period: { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() },
    next_billed_at: endsAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
  await deliverPaddleWebhook({
    backendUrl: settings.backendInternalUrl,
    secret: settings.paddle.webhookSecret,
    eventType: 'subscription.updated',
    data: renewed,
  });
  return renewed;
}

/** Paddle transactions created by plan changes on a subscription (proration charges). */
export async function planChangeCharges(settings: QaSettings, subscriptionId: string): Promise<any[]> {
  return paddleApi(settings).listTransactions(subscriptionId, 'subscription_update');
}

/**
 * Choose a paid plan and billing interval on the core plan picker and pay in the Paddle sandbox
 * overlay. Then deliver Paddle's resulting subscription to the app's webhook, the path that
 * grants entitlements. Returns the subscription as Paddle reports it.
 */
export async function purchasePlanThroughUi(
  page: Page,
  { plan, interval = 'monthly', customer, settings }: {
    plan: string;
    interval?: string;
    customer: QaIdentity;
    settings: QaSettings;
  },
): Promise<any> {
  await page.goto('/onboarding?lang=en');
  if (interval === 'annually') {
    await page.getByRole('button', { name: new RegExp(label('core.upgradeModal.annualBilling')) }).click();
  }
  const choosePlan = page.getByRole('button', { name: label(PLAN_CTA_KEYS[plan]), exact: true });
  await expect(choosePlan).toBeEnabled({ timeout: 30_000 });
  await choosePlan.click();

  await payWithPaddleOverlay(page, {
    email: customer.email,
    cardholderName: `${customer.firstName} ${customer.lastName}`,
    card: settings.card,
  });

  const priceId = settings.paddle.priceIds[interval][plan];
  const subscription = await paddleApi(settings).waitForSubscription({ email: customer.email, priceId });
  // Let the app's own post-checkout handling settle before the harness navigates anywhere.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  return forwardSubscriptionWebhook(settings, subscription.id, 'subscription.created');
}

/** New customer -> verified account -> paid plan, with the account linked to its subscription. */
export async function buyPlan(
  page: Page,
  db: Db,
  { plan, interval = 'monthly', customer, settings }: {
    plan: string;
    interval?: string;
    customer: QaIdentity;
    settings: QaSettings;
  },
): Promise<{ authUser: Record<string, any>; subscription: any; profile: Record<string, any> }> {
  const authUser = await createVerifiedAccount(page, db, customer, settings);
  const subscription = await purchasePlanThroughUi(page, { plan, interval, customer, settings });
  const profile = await expectProfile(
    db,
    authUser.id,
    (row) => row.paddle_subscription_id === subscription.id && row.subscription_tier === plan,
    `profile entitled to ${plan} via Paddle subscription ${subscription.id}`,
  );
  return { authUser, subscription, profile };
}

/** The customer's core account settings page, with its billing section loaded. */
export async function openAccountSettings(page: Page, customer: QaIdentity, settings: QaSettings): Promise<void> {
  const details = page.waitForResponse((res) => res.url().startsWith(`${settings.apiUrl}/billing/subscription-details`));
  await page.goto(`/${customer.username}/settings?lang=en`);
  await details;
}

/** Acknowledge the app's notice dialog with the given title. */
export async function acknowledgeNotice(page: Page, titleKey: string): Promise<void> {
  const notice = page.getByRole('dialog', { name: label(titleKey) });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: label('core.accessibility.ok'), exact: true }).click();
  await expect(notice).toBeHidden();
}

export const daysUntil = (isoDate: string): number => (new Date(isoDate).getTime() - Date.now()) / 86_400_000;
