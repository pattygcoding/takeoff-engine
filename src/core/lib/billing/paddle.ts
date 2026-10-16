import { initializePaddle } from '@paddle/paddle-js';
import type { PaddleEventData } from '@paddle/paddle-js';
import { getTranslation } from '@/core/lib/shared/i18n';

type PaddleClient = NonNullable<Awaited<ReturnType<typeof initializePaddle>>>;
type PaddleEventHandler = (event: PaddleEventData) => void;

let paddleInstance: PaddleClient | null | undefined = null;
let activeEventCallback: PaddleEventHandler | null = null;

/**
 * Get or initialize Paddle.js singleton
 */
export async function getPaddleInstance() {
  if (paddleInstance) return paddleInstance;

  const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';

  if (!clientToken) {
    console.warn(getTranslation('core.paddle.tokenNotConfiguredWarn'));
    return null;
  }

  try {
    paddleInstance = await initializePaddle({
      environment: environment === 'production' ? 'production' : 'sandbox',
      token: clientToken,
      eventCallback: (event) => {
        console.log('[Paddle Global Event Callback]', event?.name, event);
        if (activeEventCallback) {
          activeEventCallback(event);
        }
      },
    });
    return paddleInstance;
  } catch (err) {
    console.error(getTranslation('core.paddle.initFailed'), err);
    return null;
  }
}

export interface PaddleCheckoutItem {
  priceId: string;
  quantity: number;
}

export interface OpenPaddleCheckoutOptions {
  priceId?: string;
  items?: PaddleCheckoutItem[];
  customerEmail?: string;
  customData?: Record<string, unknown>;
  onSuccess?: (event: PaddleEventData) => void;
  onClose?: () => void;
}

/** Checkout events that mean the payment went through; the names differ across Paddle.js versions. */
const CHECKOUT_SUCCESS_EVENTS = new Set([
  'checkout.completed',
  'checkout.payment.successful',
  'transaction.completed',
]);

/**
 * Routes a Paddle checkout event to the caller's hooks. The event name lives on `name`, `type`, or
 * the legacy `event` alias depending on the Paddle.js version that emitted it.
 */
function dispatchCheckoutEvent(
  event: PaddleEventData,
  onSuccess?: (event: PaddleEventData) => void,
  onClose?: () => void,
): void {
  console.log('[Paddle Checkout Event]', event?.name, event);
  const raw = event as unknown as Record<string, unknown>;
  const eventName = [raw.name, raw.type, raw.event].find((value): value is string => typeof value === 'string') ?? '';

  if (CHECKOUT_SUCCESS_EVENTS.has(eventName)) {
    if (onSuccess) onSuccess((event.data as unknown as PaddleEventData) || event);
    return;
  }
  if (eventName === 'checkout.closed') {
    if (onClose) onClose();
    return;
  }
  if (eventName === 'checkout.error' || eventName === 'checkout.warning') {
    console.error('[Paddle Error/Warning]', event);
  }
}

/** Paddle `custom_data` only accepts string values, so null/undefined entries are dropped. */
function toPaddleCustomData(customData: Record<string, unknown> | undefined): Record<string, string> {
  if (!customData || typeof customData !== 'object') return {};
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(customData)) {
    if (value !== undefined && value !== null) sanitized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  return sanitized;
}

/** A customer email is only forwarded when it is a non-empty string that looks like an address. */
function isUsableEmail(value: unknown): value is string {
  return typeof value === 'string' && value.includes('@');
}

/**
 * Open Paddle hosted overlay checkout
 */
export async function openPaddleCheckout({
  priceId,
  items,
  customerEmail,
  customData,
  onSuccess,
  onClose,
}: OpenPaddleCheckoutOptions): Promise<boolean> {
  const paddle = await getPaddleInstance();

  let checkoutItems = items ?? [];
  if (checkoutItems.length === 0 && priceId) {
    checkoutItems = [{ priceId, quantity: 1 }];
  }

  if (!paddle || checkoutItems.length === 0) {
    // If Paddle token or price is not yet configured, fall back to mock checkout notice
    return false;
  }

  // Convert customData values to strings for Paddle custom_data key-value constraints
  const sanitizedCustomData = toPaddleCustomData(customData);

  const checkoutPayload: {
    items: PaddleCheckoutItem[];
    settings: { displayMode: 'overlay'; theme: 'light'; successUrl: string };
    customer?: { email: string };
    customData?: Record<string, string>;
  } = {
    items: checkoutItems,
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      successUrl: window.location.href.split('#')[0],
    },
  };

  if (isUsableEmail(customerEmail)) {
    checkoutPayload.customer = { email: customerEmail.trim() };
  }

  if (Object.keys(sanitizedCustomData).length > 0) {
    checkoutPayload.customData = sanitizedCustomData;
  }

  const handleCheckoutEvent = (event: PaddleEventData) => dispatchCheckoutEvent(event, onSuccess, onClose);

  activeEventCallback = handleCheckoutEvent;

  // Paddle's runtime `Checkout.open` accepts `eventCallback` (documented), though the bundled types omit it.
  const openOptions = { ...checkoutPayload, eventCallback: handleCheckoutEvent };
  paddle.Checkout.open(openOptions as Parameters<typeof paddle.Checkout.open>[0]);

  return true;
}
