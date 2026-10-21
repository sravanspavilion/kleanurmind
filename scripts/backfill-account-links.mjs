// One-off repair: fills the "App User ID" column on existing Customer Accounts
// rows by matching the account email against the local database. Idempotent —
// already-linked rows are never changed, so re-running is safe.
//
// Run after deploying the updated apps-script/DemoRequests.gs:
//   node scripts/backfill-account-links.mjs
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHmac } from 'node:crypto';

const config = {};
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) Object.assign(config, parseEnv(readFileSync(file, 'utf8')));
}
Object.assign(config, process.env);
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });

async function call(action, data) {
  const timestamp = Date.now();
  const payload = JSON.stringify({ action, actor: { id: 'connector-backfill', email: config.GOOGLE_SCRIPT_ACTOR_EMAIL || 'connector@kleanurmind.in' }, data });
  const signature = createHmac('sha256', config.GOOGLE_SCRIPT_SECRET).update(`${timestamp}.${payload}`).digest('hex');
  const response = await fetch(config.GOOGLE_SCRIPT_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ timestamp, payload, signature }), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error?.message || 'Connector rejected the request.');
  return result.data;
}

try {
  await call('health', {});
  console.log('Signed health check passed.');
  // Only password accounts exist as Customer Accounts rows.
  const users = await db.user.findMany({
    where: { passwordHash: { not: null }, email: { not: null } },
    select: { id: true, email: true },
  });
  if (users.length === 0) {
    console.log('No password accounts found in the database; nothing to backfill.');
  } else {
    const links = users.map((user) => ({ email: user.email, userId: user.id }));
    const result = await call('syncDemoRequest', { kind: 'account', operation: 'backfillAccountLinks', links });
    console.log(`PASS: ${result.updated} of ${links.length} account rows linked (requested ${result.requested}).`);
    if (result.updated < links.length) console.log('NOTE: the remainder were already linked or have no matching sheet row.');
  }
} catch (error) {
  console.error(`Backfill: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
