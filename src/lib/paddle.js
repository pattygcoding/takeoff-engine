import { initializePaddle } from '@paddle/paddle-js';
import { getTranslation } from './i18n';

let paddleInstance = null;

/**
 * Get or initialize Paddle.js singleton
 */
export async function getPaddleInstance() {
  if (paddleInstance) return paddleInstance;

  const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';

  if (!clientToken) {
    console.warn(getTranslation('paddle.tokenNotConfiguredWarn'));
    return null;
  }

  try {
    paddleInstance = await initializePaddle({
      environment: environment === 'production' ? 'production' : 'sandbox',
      token: clientToken,
    });
    return paddleInstance;
  } catch (err) {
    console.error(getTranslation('paddle.initFailed'), err);
    return null;
  }
}

/**
 * Open Paddle hosted overlay checkout
 */
export async function openPaddleCheckout({ priceId, items, customerEmail, customData, onSuccess, onClose }) {
  const paddle = await getPaddleInstance();

  const checkoutItems = items && items.length > 0
    ? items
    : (priceId ? [{ priceId, quantity: 1 }] : []);

  if (!paddle || checkoutItems.length === 0) {
    // If Paddle token or price is not yet configured, fall back to mock checkout notice
    return false;
  }

  // Convert customData values to strings for Paddle custom_data key-value constraints
  const sanitizedCustomData = {};
  if (customData && typeof customData === 'object') {
    for (const [key, val] of Object.entries(customData)) {
      if (val !== undefined && val !== null) {
        sanitizedCustomData[key] = String(val);
      }
    }
  }

  const checkoutPayload = {
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

  paddle.Checkout.open({
    ...checkoutPayload,
    eventCallback: (event) => {
      console.log('[Paddle Checkout Event]', event);
      if (event.name === 'checkout.completed') {
        if (onSuccess) onSuccess(event.data);
      } else if (event.name === 'checkout.closed') {
        if (onClose) onClose();
      } else if (event.name === 'checkout.error' || event.name === 'checkout.warning') {
        console.error('[Paddle Error/Warning]', event);
      }
    },
  });

  return true;
}
