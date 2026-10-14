import { bookingSchema } from '@/lib/validation';
import { demoSheetsEnabled } from '@/lib/demo/sheets';
import { callGoogleSheet, isGoogleSheetConfigured } from '@/lib/integrations/google-sheet';

// An isolated, append/upsert-only demo receiver; no database or production actors.
let windowStart = 0;
let attempts = 0;
const MAX_BYTES = 24000;
export async function POST(request: Request) {
  if (!demoSheetsEnabled()) return Response.json({ error: 'Sheet demo submissions are disabled.' }, { status: 404 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!isGoogleSheetConfigured()) return Response.json({ error: 'Google Sheets setup is incomplete. Your demo request remains saved in this browser.' }, { status: 503 });
  if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); attempts = 0; }
  if (++attempts > 20) return Response.json({ error: 'Too many Sheet submissions. Retry in a minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return Response.json({ error: 'Request is too large.' }, { status: 413 });
  let input;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BYTES) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    input = JSON.parse(body);
  } catch { return Response.json({ error: 'Invalid request data.' }, { status: 400 }); }
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: parsed.error.issues.map(issue => issue.message).join(' ') }, { status: 400 });
  const id = `DEMO-${parsed.data.requestKey}`;
  try {
    const result = await callGoogleSheet<{ demoRequestId?: string }>({
      action: 'syncDemoRequest', actor: { id: 'public-demo', email: 'demo@example.test' },
      requestId: id, data: { id, demo: true, status: 'REQUESTED', ...parsed.data },
    });
    if (result?.demoRequestId !== id) throw new Error('Missing demo acknowledgement');
    return Response.json({ ok: true, id });
  } catch {
    return Response.json({ error: 'Google Sheets did not confirm this request. Check the shared secret and deployed demo receiver, then retry. Your browser copy is saved.' }, { status: 502 });
  }
}
