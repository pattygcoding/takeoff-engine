import crypto from 'node:crypto';

// Every account, email, and Paddle customer created by the QA suite carries this marker so
// teardown can find and remove everything a run (or a previously crashed run) created.
export const QA_TAG = 'qae2e';

export const QA_PLANS = ['starter', 'pro', 'enterprise'];
export const QA_INTERVALS = ['monthly', 'annually'];

const DEFAULTS = {
  frontendPort: 4177,
  backendPort: 5055,
  emailTemplate: 'delivered+{tag}@resend.dev',
  snapshotSchemas: 'public,auth',
};

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'PADDLE_ENVIRONMENT',
  'PADDLE_API_KEY',
  'VITE_PADDLE_ENVIRONMENT',
  'VITE_PADDLE_CLIENT_TOKEN',
];

const csv = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const lower = (value) => String(value || '').trim().toLowerCase();

export const webhookSecretOf = (env = process.env) => env.PADDLE_WEBHOOK_SECRET || env.PADDLE_WEBHOOK_SECRET_KEY || '';

/** Paddle catalog price IDs for each plan, by billing interval (same keys the backend reads). */
export function planPriceIds(env = process.env) {
  return {
    monthly: {
      starter: env.PADDLE_PRICE_ID_STARTER_MONTHLY || env.PADDLE_PRICE_ID_STARTER,
      pro: env.PADDLE_PRICE_ID_PRO_MONTHLY || env.PADDLE_PRICE_ID_PRO,
      enterprise: env.PADDLE_PRICE_ID_ENTERPRISE_MONTHLY || env.PADDLE_PRICE_ID_ENTERPRISE,
    },
    annually: {
      starter: env.PADDLE_PRICE_ID_STARTER_ANNUALLY,
      pro: env.PADDLE_PRICE_ID_PRO_ANNUALLY,
      enterprise: env.PADDLE_PRICE_ID_ENTERPRISE_ANNUALLY,
    },
  };
}

/**
 * Returns every reason the environment is unsafe for QA. The database may be shared (its
 * integrity is verified by the global setup/teardown), but money must never move: Paddle has
 * to be the sandbox on both the backend and the browser, and nothing may look like production.
 */
export function findSafetyViolations(env = process.env) {
  const problems = REQUIRED.filter((key) => !env[key]).map((key) => `${key} is not set.`);
  if (!webhookSecretOf(env)) problems.push('PADDLE_WEBHOOK_SECRET_KEY (or PADDLE_WEBHOOK_SECRET) is not set.');
  for (const [interval, prices] of Object.entries(planPriceIds(env))) {
    for (const [plan, priceId] of Object.entries(prices)) {
      if (!priceId) problems.push(`PADDLE_PRICE_ID_${plan.toUpperCase()}_${interval.toUpperCase()} is not set.`);
    }
  }
  if (problems.length) return problems;

  if (lower(env.NODE_ENV) === 'production') problems.push('NODE_ENV must not be "production".');
  if (env.RENDER || env.RENDER_EXTERNAL_URL) problems.push('QA must not run on a deployed host (RENDER is set).');
  for (const key of ['PADDLE_ENVIRONMENT', 'VITE_PADDLE_ENVIRONMENT']) {
    if (lower(env[key]) !== 'sandbox') problems.push(`${key} must be "sandbox".`);
  }
  if (lower(env.PADDLE_API_KEY).includes('_live_')) problems.push('PADDLE_API_KEY is a live Paddle key.');
  if (lower(env.VITE_PADDLE_CLIENT_TOKEN).startsWith('live_')) problems.push('VITE_PADDLE_CLIENT_TOKEN is a live Paddle token.');
  return problems;
}

export function assertSafeQaEnvironment(env = process.env) {
  const problems = findSafetyViolations(env);
  if (problems.length) {
    throw new Error(
      'Refusing to run QA tests:\n'
      + problems.map((problem) => `  - ${problem}`).join('\n')
      + '\nRun them with "npm run test:qa" (Infisical dev environment). See tests/qa/README.md.',
    );
  }
}

/**
 * Non-secret, derived settings shared by the Playwright config, global setup, and specs.
 */
export function loadQaSettings(env = process.env) {
  const frontendPort = Number(env.QA_FRONTEND_PORT || DEFAULTS.frontendPort);
  const backendPort = Number(env.QA_BACKEND_PORT || DEFAULTS.backendPort);
  const supabaseGatewayPort = Number(env.QA_SUPABASE_GATEWAY_PORT || backendPort + 1);
  // Backend CORS accepts any http://localhost:* origin, and same-site cookies need one host name.
  const frontendUrl = `http://localhost:${frontendPort}`;
  const backendUrl = `http://localhost:${backendPort}`;
  return {
    frontendPort,
    backendPort,
    frontendUrl,
    backendUrl,
    // Node-side calls go straight to IPv4: the backend binds 0.0.0.0, and Node may resolve localhost to ::1.
    backendInternalUrl: `http://127.0.0.1:${backendPort}`,
    apiUrl: `${backendUrl}/api`,
    supabaseGatewayPort,
    supabaseGatewayUrl: `http://127.0.0.1:${supabaseGatewayPort}`,
    emailTemplate: env.QA_EMAIL_TEMPLATE || DEFAULTS.emailTemplate,
    snapshotSchemas: csv(env.QA_SNAPSHOT_SCHEMAS || DEFAULTS.snapshotSchemas),
    paddle: {
      apiBaseUrl: 'https://sandbox-api.paddle.com',
      priceIds: planPriceIds(env),
      seatPriceIds: {
        monthly: env.PADDLE_PRICE_ID_EXTRA_SEAT_MONTHLY || env.PADDLE_PRICE_ID_EXTRA_SEAT,
        annually: env.PADDLE_PRICE_ID_EXTRA_SEAT_ANNUALLY,
      },
      webhookSecret: webhookSecretOf(env),
    },
    card: {
      number: env.QA_CARD_NUMBER || '4242 4242 4242 4242',
      cvv: env.QA_CARD_CVV || '100',
      postcode: env.QA_CARD_POSTCODE || '90210',
      country: env.QA_CARD_COUNTRY || 'US',
    },
  };
}

/**
 * A unique, recognizably tagged customer. The password is random per run so it can never be
 * in a breach corpus (registration rejects breached passwords).
 */
export function createQaIdentity(label, { emailTemplate = DEFAULTS.emailTemplate } = {}) {
  const suffix = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const tag = `${QA_TAG}-${label}-${suffix}`.toLowerCase();
  return {
    tag,
    username: tag,
    email: emailTemplate.replace('{tag}', tag).toLowerCase(),
    password: `Qa!${crypto.randomBytes(12).toString('base64url')}7z`,
    firstName: 'QA',
    lastName: `Automation ${label}`,
    phone: '5555550123',
    // Each simulated customer gets its own documentation-range IPv6 address, so the backend's
    // per-IP auth rate limiter sees separate clients instead of one machine signing up repeatedly.
    clientIp: `2001:db8::${crypto.randomBytes(8).toString('hex').match(/.{4}/g).join(':')}`,
  };
}
