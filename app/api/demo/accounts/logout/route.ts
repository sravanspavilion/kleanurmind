import { cookies } from 'next/headers';
import { DEMO_ACCOUNT_COOKIE } from '@/lib/demo/accounts';

export async function POST() {
  (await cookies()).delete(DEMO_ACCOUNT_COOKIE);
  return Response.json({ ok: true });
}
