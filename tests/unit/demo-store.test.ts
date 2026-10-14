import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { placeDemoRequest, readDemoRequests, resetDemoData, sampleContact } from '@/lib/demo/browser-store';

const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubEnv('DEMO_MODE', 'true');
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
  vi.stubGlobal('localStorage', {
    get length() { return values.size; }, key: (i: number) => [...values.keys()][i],
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const data = () => ({
  ...sampleContact, requestKey: crypto.randomUUID(), service: 'LAUNDRY',
  laundry: { type: 'WASH_FOLD', bags: 2, instructions: 'Sample linens' },
  pickupStart: new Date(Date.now() + 86400000).toISOString(),
});

describe('browser-only demo requests', () => {
  it('validates input and returns the same request for a repeated submission', () => {
    const input = data();
    const request = placeDemoRequest(input);
    expect(placeDemoRequest(input).id).toBe(request.id);
    expect(readDemoRequests()).toHaveLength(1);
    expect(() => placeDemoRequest({ ...input, phone: 'invalid' })).toThrow();
  });
  it('keeps historical requests readable after appointment time has passed', () => {
    placeDemoRequest(data());
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 7 * 86400000);
    try { expect(readDemoRequests()).toHaveLength(1); } finally { vi.useRealTimers(); }
  });
  it('resets only demo storage and rejects production submissions', () => {
    values.set('production-preference', 'preserve');
    placeDemoRequest(data()); resetDemoData();
    expect(readDemoRequests()).toEqual([]);
    expect(values.get('production-preference')).toBe('preserve');
    vi.stubEnv('DEMO_MODE', 'false'); vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
    expect(() => placeDemoRequest(data())).toThrow('disabled');
  });
});
