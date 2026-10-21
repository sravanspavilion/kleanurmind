import { spawnSync } from 'node:child_process';

// Require deployment settings explicitly: committed local .env files must not
// silently make a cloud deployment connect to localhost.
const demo = [process.env.DEMO_MODE, process.env.NEXT_PUBLIC_DEMO_MODE]
  .some(value => value === 'true' || value === '1');

if (!demo) {
  let database;
  try {
    database = new URL(process.env.DATABASE_URL ?? '');
  } catch {
    console.error('Set DATABASE_URL in Vercel environment variables to your hosted PostgreSQL connection string.');
    process.exit(1);
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) ||
      ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'db'].includes(database.hostname)) {
    console.error('DATABASE_URL must point to hosted PostgreSQL. Vercel cannot use the database on your local computer.');
    process.exit(1);
  }
  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    console.error('Set NEXTAUTH_SECRET in Vercel environment variables before deploying real accounts.');
    process.exit(1);
  }
  let origin;
  try {
    origin = new URL(process.env.NEXTAUTH_URL ?? '');
  } catch {
    console.error('Set NEXTAUTH_URL to the HTTPS origin of your deployed website.');
    process.exit(1);
  }
  if (origin.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
    console.error('NEXTAUTH_URL must use the HTTPS origin of your deployed website, not localhost.');
    process.exit(1);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

run('npm', ['run', 'db:generate']);
if (!demo) {
  run('npm', ['run', 'db:migrate']);
  run('npm', ['run', 'db:auth:check']);
}
run('next', ['build']);
