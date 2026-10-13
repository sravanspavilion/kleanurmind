import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compare } from 'bcryptjs';

vi.mock('@/lib/db', () => ({ db: { user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() } } }));
vi.mock('@/lib/security', () => ({ rateLimit: vi.fn() }));
import { db } from '@/lib/db';
import { authenticatePassword, registerCustomer, registrationSchema } from '@/lib/password-auth';

beforeEach(() => { vi.resetAllMocks(); });

describe('Email and password accounts', () => {
  it('normalizes email and rejects short or bcrypt-truncated passwords', () => {
    expect(registrationSchema.parse({ name: 'Test', email: ' TEST@example.com ', password: 'password123' }).email).toBe('test@example.com');
    expect(registrationSchema.safeParse({ name: 'Test', email: 'test@example.com', password: 'short' }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: 'Test', email: 'test@example.com', password: '😀'.repeat(19) }).success).toBe(false);
  });

  it('hashes passwords, fixes the customer role, and authenticates only a valid active account', async () => {
    await registerCustomer({ name: 'Test', email: 'TEST@example.com', password: 'password123', role: 'ADMIN' });
    const data = vi.mocked(db.user.create).mock.calls[0][0].data;
    if (!data) throw new Error('Expected account creation data');
    expect(data.role).toBe('CUSTOMER');
    expect(data.profile).toEqual({ create: {} });
    expect(data.passwordHash).not.toBe('password123');
    expect(await compare('password123', data.passwordHash!)).toBe(true);
    const user = { id: 'customer', name: 'Test', email: 'test@example.com', image: null, active: true, passwordHash: data.passwordHash };
    vi.mocked(db.user.findUnique).mockResolvedValue(user as Awaited<ReturnType<typeof db.user.findUnique>>);
    expect(await authenticatePassword({ email: 'TEST@example.com', password: 'password123' })).toEqual({ id: 'customer', name: 'Test', email: 'test@example.com', image: null });
    expect(await authenticatePassword({ email: 'test@example.com', password: 'wrong-password' })).toBeNull();
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...user, active: false } as Awaited<ReturnType<typeof db.user.findUnique>>);
    expect(await authenticatePassword({ email: 'test@example.com', password: 'password123' })).toBeNull();
  });

  it('does not overwrite an existing account or its password', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'existing' } as Awaited<ReturnType<typeof db.user.findFirst>>);
    await expect(registerCustomer({ name: 'Test', email: 'test@example.com', password: 'password123' })).rejects.toThrow('existing sign-in method');
    expect(db.user.create).not.toHaveBeenCalled();
  });
});
