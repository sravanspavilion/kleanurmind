import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/security', () => ({ sameOrigin: vi.fn(), rateLimit: vi.fn() }));
vi.mock('@/lib/password-auth', () => ({ registerCustomer: vi.fn() }));
import { registerCustomer } from '@/lib/password-auth';
import { POST } from '@/app/api/register/route';

afterEach(() => vi.restoreAllMocks());

describe('Registration database failures', () => {
  it('reports missing schema safely without exposing passwords or connection strings', async () => {
    vi.mocked(registerCustomer).mockRejectedValueOnce(Object.assign(new Error('sensitive database details'), { code: 'P2022' }));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await POST(new Request('http://localhost/api/register', { method: 'POST', body: JSON.stringify({ password: 'private-password' }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Account creation is temporarily unavailable. Please try again later.' });
    expect(log).toHaveBeenCalledWith('[registration] Account creation failed', { code: 'P2022', category: 'database_schema' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-password');
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive database details');
  });
});
