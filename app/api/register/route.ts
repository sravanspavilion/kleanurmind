import { ZodError } from 'zod';
import { registerCustomer } from '@/lib/password-auth';
import { DomainError } from '@/lib/domain';
import { rateLimit, sameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit('registration-global', 30);
    const body = await request.text();
    if (Buffer.byteLength(body) > 4096) throw new DomainError('Request too large.', 413);
    await registerCustomer(JSON.parse(body));
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? 'Check your account details.' }, { status: 400 });
    if (error instanceof SyntaxError) return Response.json({ error: 'Invalid request.' }, { status: 400 });
    return Response.json({ error: error instanceof DomainError ? error.message : 'Account creation is unavailable. Please try again.' }, { status: error instanceof DomainError ? error.status : 500 });
  }
}
