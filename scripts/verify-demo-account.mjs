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
async function call(data, action = 'syncDemoRequest') {
  const timestamp = Date.now();
  const payload = JSON.stringify({ action, actor: { id: 'connector-check', email: config.GOOGLE_SCRIPT_ACTOR_EMAIL || 'connector@kleanurmind.in' }, data: action === 'health' ? {} : { kind: 'account', ...data } });
  const signature = createHmac('sha256', config.GOOGLE_SCRIPT_SECRET).update(`${timestamp}.${payload}`).digest('hex');
  const response = await fetch(config.GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ timestamp, payload, signature }), signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error?.message || 'Account sync rejected.');
  return result.data;
}
try {
  await call({}, 'health');
  console.log('Signed health check passed.');
  const account = await db.user.findUniqueOrThrow({ where: { email: 'demo.customer@example.test' }, select: { name: true, email: true, passwordHash: true } });
  if (!account.passwordHash?.startsWith('$2')) throw new Error('Demo account has no bcrypt hash.');
  await call({ operation: 'createDemoAccount', ...account, phone: '' });
  const result = await call({ operation: 'findDemoAccount', email: account.email });
  if (result.account?.passwordHash !== account.passwordHash) throw new Error('Sheet hash does not match the local account.');
  console.log('PASS: Demo account saved in Customer Accounts; bcrypt hash matches the local database.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
