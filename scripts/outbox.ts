import { db, serial } from '../lib/db';
import { sendNotification } from '../lib/providers';
import { dispatchSheetSync } from '../lib/integrations/google-sheet';

async function main() {
  for (let n = 0; n < 100; n++) {
    const item = await serial(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; userId: string; kind: string; entityId: string; dedupeKey: string }[]>`
        SELECT id, "userId", kind, "entityId", "dedupeKey"
        FROM "Outbox"
        WHERE status = 'PENDING'
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
      const anyDelivered = results.some(r => r.status === 'DELIVERED');

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

main()
  .catch(console.error)
  .finally(() => db.$disconnect());