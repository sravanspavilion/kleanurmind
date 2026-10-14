import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const connector = vi.hoisted(() => ({ callGoogleSheet: vi.fn(), isGoogleSheetConfigured: vi.fn() }));
vi.mock('@/lib/integrations/google-sheet', () => connector);
import { POST } from '@/app/api/demo/service-requests/route';
import { sampleContact } from '@/lib/demo/browser-store';
const key = '11111111-2222-4333-8444-555555555555';
const data = () => ({ ...sampleContact, requestKey: key, service: 'LAUNDRY', laundry: { type: 'WASH_FOLD', bags: 1 }, pickupStart: new Date(Date.now()+86400000).toISOString() });
const request = (body: unknown = data(), origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/demo/service-requests', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv('DEMO_MODE', 'true'); vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true'); vi.stubEnv('DEMO_SHEETS_ENABLED', 'true');
  connector.callGoogleSheet.mockReset(); connector.isGoogleSheetConfigured.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());
describe('isolated demo Sheets submissions', () => {
  it('rejects production mode and cross-origin requests before calling Sheets', async () => {
    expect((await POST(request(data(), 'https://other.test'))).status).toBe(403);
    vi.stubEnv('DEMO_MODE', 'false'); vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
    expect((await POST(request())).status).toBe(404);
    expect(connector.callGoogleSheet).not.toHaveBeenCalled();
  });
  it('reports missing configuration and invalid input without sending', async () => {
    connector.isGoogleSheetConfigured.mockReturnValue(false);
    expect((await POST(request())).status).toBe(503);
    connector.isGoogleSheetConfigured.mockReturnValue(true);
    expect((await POST(request({ ...data(), phone: 'invalid' }))).status).toBe(400);
    expect(connector.callGoogleSheet).not.toHaveBeenCalled();
  });
  it('uses a dedicated action and requires matching demo acknowledgement', async () => {
    connector.callGoogleSheet.mockResolvedValue({ demoRequestId: `DEMO-${key}` });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: `DEMO-${key}` });
    expect(connector.callGoogleSheet).toHaveBeenCalledWith(expect.objectContaining({ action: 'syncDemoRequest', requestId: `DEMO-${key}`, data: expect.objectContaining({ demo: true, status: 'REQUESTED' }) }));
    connector.callGoogleSheet.mockResolvedValue({ bookingId: 'unrelated' });
    expect((await POST(request())).status).toBe(502);
  });
  it('reports connector failures without claiming a successful sync', async () => {
    connector.callGoogleSheet.mockRejectedValue(new Error('secret detail'));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('secret detail');
  });
});
