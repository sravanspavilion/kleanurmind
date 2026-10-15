import { cookies } from 'next/headers';
import { DEMO_ACCOUNT_COOKIE, verifyAccountSession } from '@/lib/demo/accounts';

// Reports the signed-in demo account so the panel can restore its state on load.
export async function GET() {
  const token = (await cookies()).get(DEMO_ACCOUNT_COOKIE)?.value;
  return Response.json({ account: verifyAccountSession(token) });
}
