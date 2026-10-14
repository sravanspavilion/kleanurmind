import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHmac } from 'node:crypto';

// Match local environment precedence without printing credentials or sheet data.
const env = {};
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
}
Object.assign(env, process.env);

async function main() {
  const url = env.GOOGLE_SCRIPT_URL;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error('Set GOOGLE_SCRIPT_URL to the Apps Script /exec deployment URL in .env.local.');
  }
  if (!env.GOOGLE_SCRIPT_SECRET) {
    throw new Error('GOOGLE_SCRIPT_SECRET is missing. Set it in .env.local to the same value as SHARED_SECRET in Apps Script > Project Settings > Script properties. Do not paste the secret into chat.');
  }
  const timestamp = Date.now();
  const payload = JSON.stringify({ action: 'health', actor: { id: 'connector-check', email: env.GOOGLE_SCRIPT_ACTOR_EMAIL || 'connector@kleanurmind.in' }, data: {} });
  const signature = createHmac('sha256', env.GOOGLE_SCRIPT_SECRET).update(`${timestamp}.${payload}`).digest('hex');
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ timestamp, payload, signature }),
    redirect: 'follow', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Apps Script returned HTTP ${response.status}. Check deployment access and URL.`);
  let result;
  try { result = await response.json(); } catch { throw new Error('Apps Script returned HTML instead of JSON. Check that the web app deployment is accessible to the server.'); }
  if (result.ok !== true) {
    throw new Error('Signed health check was rejected. Check the shared secret and that the deployed script supports the health action.');
  }
  console.log('PASS: Apps Script accepted a signed connection check. No booking was sent.');
  if (result.data?.spreadsheetAccessible === true) console.log('PASS: Apps Script verified access to the configured spreadsheet.');
  else console.log('NOTE: This deployed script did not confirm spreadsheet access. Deploy apps-script/OperationalMirror.gs for a spreadsheet access check.');
  if (env.DEMO_MODE === 'true' || env.NEXT_PUBLIC_DEMO_MODE === 'true') console.log('NOTE: Demo mode keeps service requests in browser storage; this check does not enable Sheet writes.');
}
main().catch(error => { console.error(`Google Sheets: ${error.message}`); process.exitCode = 1; });
