import crypto from 'node:crypto';
import { QA_TAG } from './qaEnvironment.js';

const LIVE_SUBSCRIPTION_STATUSES = 'active,trialing,past_due,paused';
const CHECKOUT_FRAME = 'iframe[name="paddle_frame"]';

/**
 * Pays in the Paddle overlay checkout using sandbox test card details. Handles both checkout
 * steps: customer/location (skipped by Paddle when already known) and card payment.
 */
export async function payWithPaddleOverlay(page, { email, cardholderName, card }) {
  const checkout = page.frameLocator(CHECKOUT_FRAME);
  const emailInput = checkout.getByTestId('authenticationEmailInput');
  const cardNumber = checkout.getByTestId('cardNumberInput');

  await emailInput.or(cardNumber).first().waitFor({ state: 'visible', timeout: 60_000 });

  if (await emailInput.isVisible()) {
    if (!(await emailInput.inputValue())) await emailInput.fill(email);
    await checkout.getByTestId('countriesSelect').selectOption(card.country);
    const postcode = checkout.getByTestId('postcodeInput');
    if (await postcode.isVisible()) await postcode.fill(card.postcode);
    await checkout.getByTestId('combinedAuthenticationLocationFormSubmitButton').click();
  }

  await cardNumber.waitFor({ state: 'visible', timeout: 60_000 });
  await cardNumber.fill(card.number);
  await checkout.getByTestId('cardholderNameInput').fill(cardholderName);
  const expiryYear = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
  await checkout.getByTestId('expiryDateField').fill(`12/${expiryYear}`);
  await checkout.getByTestId('cardVerificationValueInput').fill(card.cvv);

  // US buyers must accept recurring-charge terms. The input is visually hidden behind a styled
  // control that intercepts pointer clicks, so toggle it with the keyboard like a real user can.
  const usConsent = checkout.getByTestId('us-compliance-checkbox');
  if ((await usConsent.count()) && !(await usConsent.isChecked())) {
    await usConsent.focus();
    await usConsent.press('Space');
    if (!(await usConsent.isChecked())) throw new Error('Could not accept the Paddle US recurring-payment consent checkbox.');
  }

  await checkout.getByTestId('cardPaymentFormSubmitButton').click();
}

/**
 * Paddle Billing sandbox API client used to verify real subscriptions exist and to cancel and
 * archive everything QA created, keeping the sandbox account tidy between runs.
 */
export function createPaddleSandboxApi({ apiKey = process.env.PADDLE_API_KEY, baseUrl = 'https://sandbox-api.paddle.com' } = {}) {
  async function request(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Paddle ${method} ${path} failed: ${res.status} ${payload?.error?.detail || JSON.stringify(payload)}`);
    }
    return payload;
  }

  async function listAll(path) {
    const items = [];
    let next = `${path}${path.includes('?') ? '&' : '?'}per_page=200`;
    while (next) {
      const page = await request('GET', next.replace(baseUrl, ''));
      items.push(...(page.data || []));
      next = page.meta?.pagination?.has_more ? page.meta.pagination.next : null;
    }
    return items;
  }

  const api = {
    findCustomersByEmail: (email) => listAll(`/customers?email=${encodeURIComponent(email)}`),

    async findQaCustomers() {
      const customers = await listAll(`/customers?search=${encodeURIComponent(QA_TAG)}&status=active`);
      return customers.filter((customer) => customer.email?.toLowerCase().includes(`${QA_TAG}-`));
    },

    async listLiveSubscriptions(customerIds) {
      if (!customerIds.length) return [];
      return listAll(`/subscriptions?customer_id=${customerIds.join(',')}&status=${LIVE_SUBSCRIPTION_STATUSES}`);
    },

    async waitForSubscription({ email, priceId, timeoutMs = 90_000 }) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const customers = await api.findCustomersByEmail(email);
        const subscriptions = await api.listLiveSubscriptions(customers.map((customer) => customer.id));
        const match = subscriptions.find((subscription) => subscription.items?.some((item) => item.price?.id === priceId));
        if (match) return match;
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
      throw new Error(`No live Paddle sandbox subscription for ${email} with price ${priceId} after ${timeoutMs}ms.`);
    },

    cancelSubscriptionNow: (subscriptionId) => request('POST', `/subscriptions/${subscriptionId}/cancel`, { effective_from: 'immediately' }),
    clearScheduledChange: (subscriptionId) => request('PATCH', `/subscriptions/${subscriptionId}`, { scheduled_change: null }),

    /** Ends a subscription now, even one that already has a scheduled (end-of-period) cancellation. */
    async endSubscription(subscription) {
      try {
        await api.cancelSubscriptionNow(subscription.id);
      } catch (error) {
        if (!subscription.scheduled_change) throw error;
        await api.clearScheduledChange(subscription.id);
        await api.cancelSubscriptionNow(subscription.id);
      }
    },
    archiveCustomer: (customerId) => request('PATCH', `/customers/${customerId}`, { status: 'archived' }),
    getSubscription: async (subscriptionId) => (await request('GET', `/subscriptions/${subscriptionId}`)).data,
    listTransactions: (subscriptionId, origin) => listAll(`/transactions?subscription_id=${subscriptionId}${origin ? `&origin=${origin}` : ''}`),

    /**
     * Cancels every live QA subscription and archives every QA customer (found by tag, plus any
     * extra customer IDs recorded in the database). Paddle never deletes customers.
     */
    async purgeQaCustomers(extraCustomerIds = []) {
      const tagged = (await api.findQaCustomers()).map((customer) => customer.id);
      const customerIds = [...new Set([...tagged, ...extraCustomerIds.filter(Boolean)])];
      const subscriptions = await api.listLiveSubscriptions(customerIds);
      for (const subscription of subscriptions) await api.endSubscription(subscription);
      for (const customerId of customerIds) {
        await api.archiveCustomer(customerId).catch((error) => {
          if (!/already|archived/i.test(error.message)) throw error;
        });
      }
      return { customers: customerIds.length, subscriptions: subscriptions.length };
    },
  };
  return api;
}

/**
 * Paddle's sandbox cannot reach a backend on localhost, so the harness plays the role of the
 * webhook tunnel: it delivers the real subscription entity from Paddle to the app's webhook
 * endpoint, signed exactly like Paddle signs notifications (ts + HMAC-SHA256 of "ts:body").
 */
export async function deliverPaddleWebhook({ backendUrl, secret, eventType, data }) {
  const body = JSON.stringify({
    event_id: `evt_${QA_TAG}_${crypto.randomBytes(8).toString('hex')}`,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    notification_id: `ntf_${QA_TAG}_${crypto.randomBytes(8).toString('hex')}`,
    data,
  });
  const ts = Math.floor(Date.now() / 1000);
  const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  const res = await fetch(`${backendUrl}/api/webhooks/paddle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Paddle-Signature': `ts=${ts};h1=${h1}` },
    body,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Webhook ${eventType} was rejected: ${res.status} ${JSON.stringify(payload)}`);
  return payload;
}
