import { db, serial } from './db';
import { sendNotification } from './providers';
import { dispatchSheetSync } from './integrations/google-sheet';

export async function processOutbox(limit=20, entityId?: string) {
  for (let n = 0; n < limit; n++) {
    const item = await serial(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; userId: string; kind: string; entityId: string; dedupeKey: string }[]>`
        SELECT id, "userId", kind, "entityId", "dedupeKey"
        FROM "Outbox" AS candidate
        WHERE status = 'PENDING' AND (${entityId ?? null}::text IS NULL OR candidate."entityId" = ${entityId ?? null}) AND NOT EXISTS (SELECT 1 FROM "Outbox" AS running WHERE running."entityId" = candidate."entityId" AND running."lockedUntil" > NOW())
          AND "nextAttemptAt" <= NOW()
          AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())
        ORDER BY "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      if (!rows[0]) return null;
      return tx.outbox.update({
        where: { id: rows[0].id },
        data: { lockedUntil: new Date(Date.now() + 300000), attempts: { increment: 1 } },
      });
    });

    if (!item) break;

    try {
      // Operational records are mirrored to the private Google Sheet; the same
      // outbox retries these without creating duplicate rows.
      if (item.kind.startsWith('SHEET_')) {
        await dispatchSheetSync(item.kind, item.entityId);
        await db.outbox.update({
          where: { id: item.id },
          data: { status: 'DELIVERED', lockedUntil: null, lastError: null },
        });
        continue;
      }

      // Fetch user contact info
      const user = await db.user.findUnique({
        where: { id: item.userId },
        select: { email: true, phone: true },
      });

      const contacts = {
        email: user?.email ?? undefined,
        phone: user?.phone ?? undefined,
      };

      const results = await sendNotification(item.userId, item.kind, item.entityId, contacts);

      const allFailed = results.every(r => r.status === 'FAILED');
      if(allFailed)throw new Error('Notification delivery failed; retry scheduled.');

      await db.outbox.update({
        where: { id: item.id },
        data: {
          status: allFailed ? 'PENDING' : 'DELIVERED',
          lockedUntil: null,
          lastError: allFailed ? 'All channels failed; retry scheduled.' : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await db.outbox.update({
        where: { id: item.id },
        data: {
          lockedUntil: null,
          lastError: message,
          nextAttemptAt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** Math.min(item.attempts, 10))),
        },
      });
    }
  }

  // Clean up expired rate limits
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
