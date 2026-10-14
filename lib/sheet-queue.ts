import type { Prisma } from '@prisma/client';

// Queue within the same transaction as the business change. A worker sends the
// latest snapshot; every change has its own event so concurrent updates aren't lost.
export async function queueOrderSync(tx: Prisma.TransactionClient, orderId: string, userId: string) {
  await tx.outbox.create({ data: { dedupeKey: `SHEET_ORDER:${orderId}:${crypto.randomUUID()}`, kind: 'SHEET_ORDER', entityId: orderId, userId } });
}
