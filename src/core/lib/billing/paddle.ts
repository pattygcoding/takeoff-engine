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

  const checkoutItems = items && items.length > 0
    ? items
    : (priceId ? [{ priceId, quantity: 1 }] : []);

  if (!paddle || checkoutItems.length === 0) {
    // If Paddle token or price is not yet configured, fall back to mock checkout notice
    return false;
  }

  // Convert customData values to strings for Paddle custom_data key-value constraints
  const sanitizedCustomData: Record<string, string> = {};
  if (customData && typeof customData === 'object') {
    for (const [key, val] of Object.entries(customData)) {
      if (val !== undefined && val !== null) {
        sanitizedCustomData[key] = String(val);
      }
    }
  }

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

  if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
    checkoutPayload.customer = { email: customerEmail.trim() };
  }

  if (Object.keys(sanitizedCustomData).length > 0) {
    checkoutPayload.customData = sanitizedCustomData;
  }

  const handleCheckoutEvent = (event: PaddleEventData) => {
    console.log('[Paddle Checkout Event]', event?.name, event);
    // `name`/`type` cover the documented event shapes; `event` is a legacy alias.
    const raw = event as unknown as Record<string, unknown>;
    const eventName = raw.name || raw.type || raw.event;
    
    // Paddle emits checkout.completed, checkout.payment.successful, or transaction.completed
    if (
      eventName === 'checkout.completed' ||
      eventName === 'checkout.payment.successful' ||
      eventName === 'transaction.completed'
    ) {
      if (onSuccess) onSuccess((event.data as unknown as PaddleEventData) || event);
    } else if (eventName === 'checkout.closed') {
      if (onClose) onClose();
    } else if (eventName === 'checkout.error' || eventName === 'checkout.warning') {
      console.error('[Paddle Error/Warning]', event);
    }
  };

  activeEventCallback = handleCheckoutEvent;

  // Paddle's runtime `Checkout.open` accepts `eventCallback` (documented), though the bundled types omit it.
  const openOptions = { ...checkoutPayload, eventCallback: handleCheckoutEvent };
  paddle.Checkout.open(openOptions as Parameters<typeof paddle.Checkout.open>[0]);

  return true;
}
