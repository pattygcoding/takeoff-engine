import http from 'node:http';
import { QA_TAG } from './qaEnvironment.ts';

/**
 * QA-only gateway between the locally started backend and Supabase. Started by
 * playwright.qa.config.js; never part of the application.
 *
 * Signups for QA-tagged addresses become Admin "generate_link" calls: Supabase creates the same
 * unconfirmed user (same metadata, same profile trigger) but returns the verification token
 * instead of emailing it. No email is sent, so Supabase's email rate limit never applies to QA
 * runs. QA sign-ins that hit Supabase's per-IP auth rate limit are retried until it clears.
 * Everything else is forwarded untouched.
 */

const target = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const port = Number(process.env.QA_SUPABASE_GATEWAY_PORT);
if (!target || !serviceRoleKey || !port) {
  console.error('[qa-gateway] SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and QA_SUPABASE_GATEWAY_PORT are required.');
  process.exit(1);
}

const HOP_BY_HOP = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding', 'keep-alive']);
const verificationTokens = new Map<string, string | undefined>();
const isQaEmail = (email: unknown): boolean =>
  typeof email === 'string' && email.toLowerCase().includes(`${QA_TAG}-`);

const readBody = (req: http.IncomingMessage): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function signUpWithoutEmail(
  url: URL,
  body: { email: string; password: string; data?: unknown },
  res: http.ServerResponse,
): Promise<void> {
  const response = await fetch(`${target}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey ?? '', Authorization: `Bearer ${serviceRoleKey ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'signup',
      email: body.email,
      password: body.password,
      data: body.data,
      redirect_to: url.searchParams.get('redirect_to') || undefined,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return sendJson(res, response.status, payload);

  // eslint-disable-next-line no-unused-vars
  const { action_link, email_otp, hashed_token, redirect_to, verification_type, properties, ...user } = payload;
  verificationTokens.set(body.email.toLowerCase(), hashed_token ?? properties?.hashed_token);
  // Same shape as /signup when email confirmation is required: the user, without a session.
  return sendJson(res, 200, user.user ?? user);
}

async function forward(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  body: Buffer,
): Promise<void> {
  const headers = Object.fromEntries(
    Object.entries(req.headers).filter(([name]) => !HOP_BY_HOP.has(name)),
  ) as Record<string, string>;
  const send = () => fetch(`${target}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method ?? '') ? undefined : (body as BodyInit),
  });

  let response = await send();
  // QA sign-ins wait out Supabase's per-IP auth rate limit instead of failing the test.
  if (response.status === 429 && isQaSignIn(req, url, body)) {
    const deadline = Date.now() + RATE_LIMIT_WAIT_MS;
    while (response.status === 429 && Date.now() < deadline) {
      const retryAfter = Number(response.headers.get('retry-after')) || 10;
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 15) * 1000));
      response = await send();
    }
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    if (!HOP_BY_HOP.has(name) && name !== 'content-encoding') responseHeaders[name] = value;
  });
  res.writeHead(response.status, responseHeaders);
  res.end(Buffer.from(await response.arrayBuffer()));
}

const RATE_LIMIT_WAIT_MS = 120_000;

function isQaSignIn(req: http.IncomingMessage, url: URL, body: Buffer): boolean {
  if (req.method !== 'POST' || url.pathname !== '/auth/v1/token') return false;
  try {
    return isQaEmail(JSON.parse(body.toString('utf8') || '{}').email);
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://gateway');
    if (url.pathname === '/__qa/health') return sendJson(res, 200, { ok: true });
    if (url.pathname === '/__qa/verification-token') {
      const email = String(url.searchParams.get('email') || '').toLowerCase();
      const token = isQaEmail(email) ? verificationTokens.get(email) : undefined;
      return token ? sendJson(res, 200, { tokenHash: token }) : sendJson(res, 404, { error: 'No pending verification.' });
    }

    const body = await readBody(req);
    if (req.method === 'POST' && url.pathname === '/auth/v1/signup') {
      const payload = JSON.parse(body.toString('utf8') || '{}');
      if (isQaEmail(payload.email)) return await signUpWithoutEmail(url, payload, res);
    }
    return await forward(req, res, url, body);
  } catch (error) {
    console.error('[qa-gateway]', error);
    if (!res.headersSent) sendJson(res, 502, { error: 'QA gateway error' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`[qa-gateway] Supabase gateway on http://127.0.0.1:${port}`));
