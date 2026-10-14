import { processOutbox } from '@/lib/outbox';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requireAdmin, DomainError } from '@/lib/domain';
import { sameOrigin } from '@/lib/security';
import { isDemoMode } from '@/lib/demo/mode';
import { sheetHealth, isGoogleSheetConfigured } from '@/lib/integrations/google-sheet';

export const dynamic = 'force-dynamic';

// The public demo never contacts the real Sheets connector.
const DEMO_CONNECTOR_STATUS = {
  configured: false,
  health: { configured: false, reachable: false, actionSupported: false },
  failedCount: 0,
  failures: [] as unknown[],
};

export async function GET() {
  if (isDemoMode()) return Response.json(DEMO_CONNECTOR_STATUS);
  try {
    const actor = await requireUser();
    requireAdmin(actor);
    const [health, failures, failedCount] = await Promise.all([
      sheetHealth(),
      db.outbox.findMany({
        where: { kind: { startsWith: 'SHEET_' }, status: { not: 'DELIVERED' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, kind: true, entityId: true, status: true, attempts: true, lastError: true, createdAt: true },
      }),
      db.outbox.count({ where: { kind: { startsWith: 'SHEET_' }, status: { not: 'DELIVERED' } } }),
    ]);
    return Response.json({ configured: isGoogleSheetConfigured(), health, failedCount, failures });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Connector status is unavailable.' }, { status: 403 });
  }
}

// Queue a failed sync for another attempt. The cron performs the actual replay so
// the request stays fast and retries are not duplicated.
export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ ok: true, demo: true });
  try {
    sameOrigin(request);
    const actor = await requireUser();
    requireAdmin(actor);
    const { id } = (await request.json()) as { id?: string };
    if (!id) throw new DomainError('Choose a failed sync to retry.');
    const row = await db.outbox.findUnique({ where: { id }, select: { kind: true, lockedUntil:true } });
    if (!row || !row.kind.startsWith('SHEET_')) throw new DomainError('Sync record not found.', 404);
    if(row.lockedUntil&&row.lockedUntil>new Date())throw new DomainError('Sync is already running. Refresh shortly.',409);
    await db.outbox.update({ where: { id }, data: { status: 'PENDING', attempts: 0, lockedUntil: null, nextAttemptAt: new Date(), lastError: null } });
    await processOutbox(5);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Could not queue the retry.' }, { status: 400 });
  }
}
