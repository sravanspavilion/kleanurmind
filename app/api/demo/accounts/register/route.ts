import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import {
  DEMO_ACCOUNT_COOKIE,
  demoAccountCookieOptions,
  demoAccountsEnabled,
  demoAccountsRateLimit,
  registerAccount,
  signAccountSession,
} from '@/lib/demo/accounts';

const MAX_BYTES = 4096;

// Creates a demo account: validates the form, hashes the password on the server,
// and stores the account (never the password) in the Google Sheet.
export async function POST(request: Request) {
  if (!demoAccountsEnabled()) return Response.json({ error: 'Demo accounts are disabled.' }, { status: 404 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!demoAccountsRateLimit(20)) return Response.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return Response.json({ error: 'Request is too large.' }, { status: 413 });

  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BYTES) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: 'Invalid request data.' }, { status: 400 });
  }

  try {
    const { account, created } = await registerAccount(input);
    if (!created) return Response.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 409 });
    (await cookies()).set(DEMO_ACCOUNT_COOKIE, signAccountSession(account), demoAccountCookieOptions());
    return Response.json({ ok: true, account }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? 'Check your details.' }, { status: 400 });
    return Response.json({ error: 'Google Sheets did not confirm this account. Check the connector and try again. Nothing was saved.' }, { status: 502 });
  }
}
