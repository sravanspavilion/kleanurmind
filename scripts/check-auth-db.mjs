import env from '@next/env';
import { PrismaClient } from '@prisma/client';

env.loadEnvConfig(process.cwd());
const db = new PrismaClient();
try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Configure a PostgreSQL connection for this environment.');
  await db.$connect();
  // All three tables are used during registration. Do not fetch customer data.
  await db.$queryRaw`SELECT "id", "passwordHash" FROM "User" LIMIT 0`;
  await db.$queryRaw`SELECT "id", "userId" FROM "CustomerProfile" LIMIT 0`;
  await db.$queryRaw`SELECT "key", "count", "expiresAt" FROM "RateLimit" LIMIT 0`;
  console.log('Registration database connection and required columns are ready.');
} catch (error) {
  if (!process.env.DATABASE_URL) console.error('DATABASE_URL is missing. Configure a PostgreSQL connection for this environment.');
  else if (error.code === 'P2010' || error.code === 'P2021' || error.code === 'P2022') console.error('Registration schema check failed. Provision the database schema and run npm run db:auth:setup for the password column.');
  else console.error('Cannot connect to the registration database. Check DATABASE_URL, database availability, credentials, and network access.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
