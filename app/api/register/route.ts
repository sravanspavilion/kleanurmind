import { ZodError } from 'zod';
import { registerCustomer } from '@/lib/password-auth';
import { DomainError } from '@/lib/domain';
import { isDemoMode } from '@/lib/demo/mode';
import { rateLimit, sameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ error: 'Account creation is disabled in the public demo.' }, { status: 403 });
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
    if (!(error instanceof DomainError)) {
      // Never log the request body, password, database URL, or raw Prisma message.
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
      const initialization = error instanceof Error && error.name === 'PrismaClientInitializationError';
      console.error('[registration] Account creation failed', {
        code,
        category: initialization ? 'database_connection' : code === 'P2021' || code === 'P2022' ? 'database_schema' : 'unexpected',
      });
      if (initialization || ['P1000', 'P1001', 'P1002', 'P1017', 'P2021', 'P2022'].includes(code ?? '')) {
        return Response.json({ error: 'Account creation is temporarily unavailable. Please try again later.' }, { status: 503 });
      }
    }
    return Response.json({ error: error instanceof DomainError ? error.message : 'Account creation is unavailable. Please try again.' }, { status: error instanceof DomainError ? error.status : 500 });
  }
}
