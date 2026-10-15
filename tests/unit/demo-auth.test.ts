import { afterEach, describe, expect, it, vi } from 'vitest';
const session = vi.hoisted(() => vi.fn());
vi.mock('next-auth', () => ({ getServerSession: session }));
import { currentUser, pageUser } from '@/lib/auth';

afterEach(() => { vi.unstubAllEnvs(); session.mockReset(); });

describe('deployed demo authentication isolation', () => {
  it('renders demo identities without a production auth secret or session lookup', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    expect(await currentUser()).toMatchObject({ id: 'demo-customer', role: 'CUSTOMER' });
    expect(await pageUser(['ADMIN'])).toMatchObject({ id: 'demo-admin', role: 'ADMIN' });
    expect(session).not.toHaveBeenCalled();
  });
  it('keeps real session lookup when demo flags are off', async () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
    session.mockResolvedValue(null);
    expect(await currentUser()).toBeNull();
    expect(session).toHaveBeenCalledOnce();
  });
});
