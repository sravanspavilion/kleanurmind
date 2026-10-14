import { z } from 'zod';
import { bookingSchema } from '@/lib/validation';
import { isDemoMode } from './mode';

export const DEMO_PREFIX = 'kum-demo-v1:';
export const DEMO_DRAFT_KEY = `${DEMO_PREFIX}draft`;
const requestsKey = `${DEMO_PREFIX}requests`;
export type DemoRequest = {
  id: string;
  createdAt: string;
  sheet?: { status: 'synced' | 'failed'; message: string };
  data: z.infer<typeof bookingSchema>;
};

export function readDemoRequests(): DemoRequest[] {
  const raw = localStorage.getItem(requestsKey);
  if (!raw) return [];
  const parsed = z.array(z.object({
    id: z.string().startsWith('DEMO-'), createdAt: z.string().datetime(),
    sheet: z.object({ status: z.enum(['synced', 'failed']), message: z.string() }).optional(),
    data: z.object(bookingSchema.shape),
  })).safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Saved demo data is unreadable. Use Reset demo data to start again.');
  return parsed.data;
}

export function placeDemoRequest(input: unknown): DemoRequest {
  if (!isDemoMode()) throw new Error('Demo submissions are disabled.');
  const data = bookingSchema.parse(input);
  const requests = readDemoRequests();
  const existing = requests.find(r => r.data.requestKey === data.requestKey);
  if (existing) return existing;
  const request = { id: `DEMO-${data.requestKey}`, createdAt: new Date().toISOString(), data };
  localStorage.setItem(requestsKey, JSON.stringify([request, ...requests]));
  window.dispatchEvent(new Event('demo-data-changed'));
  return request;
}

export function resetDemoData() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(DEMO_PREFIX)) localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event('demo-data-changed'));
}

export function sampleSchedule(dayOffset = 2, hour = '10:00') {
  const day = new Date(Date.now() + dayOffset * 86400000 + 330 * 60000).toISOString().slice(0, 10);
  return `${day}T${hour}`;
}

export const sampleContact = {
  name: 'Ananya Demo', phone: '0000000000', locality: 'Mananchira',
  fullAddress: 'Demo Apartment 2B, Fictional Garden Lane (sample address)',
  landmark: 'Sample park', accessContact: 'Ananya Demo — 0000000000',
  floorLift: '2nd floor, lift available', utilities: 'Water and electricity available',
};

export type DemoAction = { id: string; action: string; data: Record<string, unknown>; createdAt: string };
export const DEMO_ACTIONS_KEY = `${DEMO_PREFIX}actions`;
export function readDemoActions(): DemoAction[] {
  return JSON.parse(localStorage.getItem(DEMO_ACTIONS_KEY) || '[]');
}
export function saveDemoAction(action: string, data: Record<string, unknown>) {
  if (!isDemoMode()) throw new Error('Demo actions are disabled.');
  const record = { id: `DEMO-${crypto.randomUUID()}`, action, data, createdAt: new Date().toISOString() };
  localStorage.setItem(DEMO_ACTIONS_KEY, JSON.stringify([record, ...readDemoActions()]));
  window.dispatchEvent(new Event('demo-data-changed'));
  return record;
}


export async function syncDemoRequest(request: DemoRequest) {
  let sheet: NonNullable<DemoRequest['sheet']>;
  try {
    const response = await fetch('/api/demo/service-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data), signal: AbortSignal.timeout(25000),
    });
    const result = await response.json();
    if (!response.ok || result.id !== request.id) throw new Error(result.error || 'Google Sheets did not confirm the request.');
    sheet = { status: 'synced', message: 'Saved to Google Sheets as a simulated demo request.' };
  } catch (error) {
    sheet = { status: 'failed', message: error instanceof Error ? error.message : 'Sheet sync failed. Retry below.' };
  }
  const requests = readDemoRequests();
  localStorage.setItem(requestsKey, JSON.stringify(requests.map(item => item.id === request.id ? { ...item, sheet } : item)));
  window.dispatchEvent(new Event('demo-data-changed'));
  return sheet;
}
