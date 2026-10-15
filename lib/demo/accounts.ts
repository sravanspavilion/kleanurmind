import { compare, hash } from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { callGoogleSheet, isGoogleSheetConfigured } from '@/lib/integrations/google-sheet';
import { isDemoMode } from './mode';

// Opt-in client accounts for the public demo. Accounts live in a separate
// "Customer Accounts" tab in the same Google Sheet as the demo requests. The
// password is hashed (bcrypt) here on the server; only the hash is sent to the
// sheet, and the hash is never returned to the browser. This is demo-grade
// storage, not a replacement for the real database-backed authentication.
//
// Account actions travel over the existing `syncDemoRequest` route so the
// deployed Apps Script only needs the account handling code (apps-script/
// DemoRequests.gs), not a new dispatch entry in Code.gs.

export const DEMO_ACCOUNT_COOKIE = 'kum-demo-account';
export const DEMO_ACCOUNT_SESSION_SECONDS = 8 * 60 * 60;

// The Apps Script deployment already routes this action, so account operations
// piggyback on it under data.kind === 'account'.
export const DEMO_ACCOUNT_ACTION = 'syncDemoRequest';

export function demoAccountsEnabled(): boolean {
  return isDemoMode() && process.env.DEMO_ACCOUNTS_ENABLED === 'true' && isGoogleSheetConfigured();
}

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const password = z.string().min(8, 'Use at least 8 characters.').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.');
const phone = z.union([z.literal(''), z.string().trim().regex(/^[+]?[0-9 ()\-]{7,20}$/, 'Enter a valid mobile number.')]).optional();

export const accountRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email,
  phone,
  password,
});
export const accountLoginSchema = z.object({
  email,
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
});

export type AccountSession = { id: string; name: string; email: string };

// A valid bcrypt hash keeps unknown-account checks comparable to password checks.
const DUMMY_HASH = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';

const ACTOR = { id: 'public-demo', email: 'demo@example.test' };

export function demoAccountCookieOptions() {
  return { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production', maxAge: DEMO_ACCOUNT_SESSION_SECONDS };
}

// The shared rateLimit helper is a no-op in demo mode, so guard per server process.
let windowStart = 0;
let attempts = 0;
export function demoAccountsRateLimit(limit = 30): boolean {
  if (Date.now() - windowStart >= 60_000) {
    windowStart = Date.now();
    attempts = 0;
  }
  return ++attempts <= limit;
}

// Signed, HttpOnly session token. Uses HMAC only, so the demo needs no database.
function sessionSecret(): string {
  return process.env.DEMO_AUTH_KEY || process.env.NEXTAUTH_SECRET || '';
}

export function signAccountSession(account: AccountSession): string {
  const payload = Buffer.from(JSON.stringify({ ...account, exp: Date.now() + DEMO_ACCOUNT_SESSION_SECONDS * 1000 })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAccountSession(token: string | undefined | null): AccountSession | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !sessionSecret()) return null;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  const supplied = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccountSession & { exp?: number };
    if (!parsed?.id || !parsed?.email || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return { id: parsed.id, name: parsed.name ?? '', email: parsed.email };
  } catch {
    return null;
  }
}

export async function registerAccount(input: unknown): Promise<{ account: AccountSession; created: boolean }> {
  const value = accountRegisterSchema.parse(input);
  const passwordHash = await hash(value.password, 12);
  const result = await callGoogleSheet<{ accountId?: string; duplicate?: boolean }>({
    action: DEMO_ACCOUNT_ACTION,
    actor: ACTOR,
    data: { kind: 'account', operation: 'createDemoAccount', name: value.name, email: value.email, phone: value.phone ?? '', passwordHash },
  });
  if (!result?.accountId) throw new Error('Google Sheets did not confirm the account.');
  return { account: { id: result.accountId, name: value.name, email: value.email }, created: !result.duplicate };
}

type AccountRecord = { accountId?: string; name?: string; email?: string; passwordHash?: string; status?: string };

export async function loginAccount(input: unknown): Promise<AccountSession | null> {
  const parsed = accountLoginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email: address, password: secret } = parsed.data;

  let found: AccountRecord | null = null;
  try {
    const result = await callGoogleSheet<{ account?: AccountRecord | null }>({ action: DEMO_ACCOUNT_ACTION, actor: ACTOR, data: { kind: 'account', operation: 'findDemoAccount', email: address } });
    found = result?.account ?? null;
  } catch {
    return null;
  }

  const valid = await compare(secret, found?.passwordHash || DUMMY_HASH);
  if (!valid || !found?.accountId || found.status === 'DISABLED') return null;

  // Best-effort last-login stamp; never block a successful sign-in.
  try {
    await callGoogleSheet({ action: DEMO_ACCOUNT_ACTION, actor: ACTOR, data: { kind: 'account', operation: 'touchDemoAccount', accountId: found.accountId } });
  } catch {
    /* ignore */
  }

  return { id: found.accountId, name: found.name ?? '', email: found.email ?? address };
}
