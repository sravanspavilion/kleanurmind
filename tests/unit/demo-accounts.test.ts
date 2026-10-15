import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callGoogleSheet } = vi.hoisted(() => ({ callGoogleSheet: vi.fn() }));
vi.mock('@/lib/integrations/google-sheet', () => ({
  callGoogleSheet,
  isGoogleSheetConfigured: () => true,
}));

import {
  accountLoginSchema,
  accountRegisterSchema,
  demoAccountsEnabled,
  loginAccount,
  registerAccount,
  signAccountSession,
  verifyAccountSession,
} from '@/lib/demo/accounts';

describe('demo account session', () => {
  beforeEach(() => { process.env.NEXTAUTH_SECRET = 'test-session-secret'; });

  it('round-trips a signed session and rejects tampering', () => {
    const token = signAccountSession({ id: 'ACC-1', name: 'Ananya Menon', email: 'ananya@example.test' });
    expect(verifyAccountSession(token)).toEqual({ id: 'ACC-1', name: 'Ananya Menon', email: 'ananya@example.test' });
    expect(verifyAccountSession(`${token}tampered`)).toBeNull();
    expect(verifyAccountSession(undefined)).toBeNull();
    expect(verifyAccountSession('not-a-token')).toBeNull();
  });

  it('rejects an expired session', () => {
    const payload = Buffer.from(JSON.stringify({ id: 'ACC-1', name: 'X', email: 'x@example.test', exp: Date.now() - 1000 })).toString('base64url');
    const signature = createHmac('sha256', 'test-session-secret').update(payload).digest('base64url');
    expect(verifyAccountSession(`${payload}.${signature}`)).toBeNull();
  });
});

describe('demo account validation', () => {
  it('accepts a well-formed registration and lower-cases the email', () => {
    const parsed = accountRegisterSchema.parse({ name: 'Demo', email: '  Demo@Example.Test ', phone: '+91 98470 12345', password: 'longenough1' });
    expect(parsed.email).toBe('demo@example.test');
    expect(parsed.phone).toBe('+91 98470 12345');
  });

  it('rejects short passwords and bad emails', () => {
    expect(accountRegisterSchema.safeParse({ name: 'Demo', email: 'not-an-email', password: 'longenough1' }).success).toBe(false);
    expect(accountRegisterSchema.safeParse({ name: 'Demo', email: 'demo@example.test', password: 'short' }).success).toBe(false);
    expect(accountLoginSchema.safeParse({ email: 'demo@example.test', password: '' }).success).toBe(false);
  });
});

describe('demo account connector calls', () => {
  beforeEach(() => {
    callGoogleSheet.mockReset();
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_ACCOUNTS_ENABLED = 'true';
    process.env.GOOGLE_SCRIPT_URL = 'https://example.test/exec';
    process.env.GOOGLE_SCRIPT_SECRET = 'secret';
  });

  it('hashes the password before sending it to the sheet', async () => {
    callGoogleSheet.mockResolvedValue({ accountId: 'ACC-9', duplicate: false });
    const { account, created } = await registerAccount({ name: 'Ananya', email: 'ananya@example.test', phone: '', password: 'longenough1' });
    expect(created).toBe(true);
    expect(account).toEqual({ id: 'ACC-9', name: 'Ananya', email: 'ananya@example.test' });
    const sent = callGoogleSheet.mock.calls[0][0];
    expect(sent.action).toBe('syncDemoRequest');
    expect(sent.data.kind).toBe('account');
    expect(sent.data.operation).toBe('createDemoAccount');
    expect(sent.data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify(sent)).not.toContain('longenough1');
    expect(demoAccountsEnabled()).toBe(true);
  });

  it('reports an existing account as not created', async () => {
    callGoogleSheet.mockResolvedValue({ accountId: 'ACC-9', duplicate: true });
    const { created } = await registerAccount({ name: 'Ananya', email: 'ananya@example.test', password: 'longenough1' });
    expect(created).toBe(false);
  });

  it('verifies a correct password and stamps the last login', async () => {
    const { hash } = await import('bcryptjs');
    const passwordHash = await hash('longenough1', 12);
    callGoogleSheet
      .mockResolvedValueOnce({ account: { accountId: 'ACC-9', name: 'Ananya', email: 'ananya@example.test', passwordHash, status: 'ACTIVE' } })
      .mockResolvedValueOnce({ accountId: 'ACC-9' });
    const account = await loginAccount({ email: 'ananya@example.test', password: 'longenough1' });
    expect(account).toEqual({ id: 'ACC-9', name: 'Ananya', email: 'ananya@example.test' });
    expect(callGoogleSheet.mock.calls[1][0].action).toBe('syncDemoRequest');
    expect(callGoogleSheet.mock.calls[1][0].data.operation).toBe('touchDemoAccount');
  });

  it('rejects a wrong password without stamping a login', async () => {
    const { hash } = await import('bcryptjs');
    const passwordHash = await hash('longenough1', 12);
    callGoogleSheet.mockResolvedValueOnce({ account: { accountId: 'ACC-9', email: 'ananya@example.test', passwordHash, status: 'ACTIVE' } });
    expect(await loginAccount({ email: 'ananya@example.test', password: 'wrongpassword' })).toBeNull();
    expect(callGoogleSheet).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown account', async () => {
    callGoogleSheet.mockResolvedValueOnce({ account: null });
    expect(await loginAccount({ email: 'nobody@example.test', password: 'longenough1' })).toBeNull();
  });
});
