import { cookies } from 'next/headers';
import {
  DEMO_ACCOUNT_COOKIE,
  demoAccountCookieOptions,
  demoAccountsEnabled,
  demoAccountsRateLimit,
  loginAccount,
  signAccountSession,
} from '@/lib/demo/accounts';

const MAX_BYTES = 4096;

// Signs in a demo account: the sheet lookup and password comparison happen on
// the server, so the stored hash is never sent to the browser.
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

  const account = await loginAccount(input);
  if (!account) return Response.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  (await cookies()).set(DEMO_ACCOUNT_COOKIE, signAccountSession(account), demoAccountCookieOptions());
  return Response.json({ ok: true, account });
}
