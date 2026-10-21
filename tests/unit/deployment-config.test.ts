import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('Next.js build output', () => {
  it('uses the Vercel adapter directory even for demo deployments', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    const { default: config } = await import('../../next.config');
    expect(config.distDir).toBe('.next');
  });

  it('keeps local demo builds separate', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    const { default: config } = await import('../../next.config');
    expect(config.distDir).toBe('.next-demo');
  });
});
