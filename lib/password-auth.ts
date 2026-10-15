import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { DomainError } from './domain';
import { rateLimit } from './security';
import { mirrorAccountToSheetSafely } from './integrations/google-sheet';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, 'Use at least 8 characters.').refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.');
export const registrationSchema = z.object({ name: z.string().trim().min(1).max(100), email, password });
const loginSchema = z.object({ email, password: z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72) });
// A valid bcrypt hash keeps unknown-account checks comparable to password checks.
const dummyHash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';

export async function registerCustomer(input: unknown) {
  const value = registrationSchema.parse(input);
  await rateLimit(`register:${value.email}`, 5);
  const existing = await db.user.findFirst({ where: { email: { equals: value.email, mode: 'insensitive' } }, select: { id: true } });
  if (existing) throw new DomainError('Unable to create this account. Try signing in with your existing sign-in method.', 409);
  const passwordHash = await hash(value.password, 12);
  try {
    await db.user.create({ data: { email: value.email, name: value.name, passwordHash, role: 'CUSTOMER', profile: { create: {} } } });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new DomainError('Unable to create this account. Try signing in with your existing sign-in method.', 409);
    throw error;
  }
  // Best-effort copy to the Google Sheet's "Customer Accounts" tab (bcrypt hash
  // only). The account is already created, so a Sheets failure is non-fatal.
  await mirrorAccountToSheetSafely({ name: value.name, email: value.email, passwordHash });
}

export async function authenticatePassword(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  await rateLimit(`login:${parsed.data.email}`, 10);
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await compare(parsed.data.password, user?.passwordHash ?? dummyHash);
  if (!valid || !user?.passwordHash || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
