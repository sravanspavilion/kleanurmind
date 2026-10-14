import { createHmac } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

// Server-side client for the "Klean Ur Mind — Google Sheets Connector" Apps Script.
//
// The script only accepts requests that arrive with a valid HMAC signature and a
// recent timestamp, so it must never be called from the browser (the shared secret
// stays on the server). Configure it with:
//   GOOGLE_SCRIPT_URL    - the /exec web app URL
//   GOOGLE_SCRIPT_SECRET - the SHARED_SECRET saved in the script's Script Properties

const REQUEST_TIMEOUT_MS = 8000;
const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30

const FURNISHING: Record<string, string> = { FURNISHED: 'Furnished', EMPTY: 'Empty' };
const LAUNDRY_TYPE: Record<string, string> = { WASH_FOLD: 'Wash & Fold', WASH_IRON: 'Wash & Iron' };

export class GoogleSheetError extends Error {
  constructor(message: string, public code = 'INTERNAL') {
    super(message);
    this.name = 'GoogleSheetError';
  }
}

const mirrorInclude = {
  address: true,
  items: { include: { service: true } },
  cleaning: true,
  laundry: true,
  appointments: true,
  user: { select: { email: true, phone: true } },
} satisfies Prisma.OrderInclude;

type MirrorOrder = Prisma.OrderGetPayload<{ include: typeof mirrorInclude }>;

export function isGoogleSheetConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SCRIPT_URL && process.env.GOOGLE_SCRIPT_SECRET);
}

// Matches Utilities.computeHmacSha256Signature(timestamp + "." + payload, secret).
export function signSheetRequest(secret: string, timestamp: number, payload: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

// The connector requires "YYYY-MM-DDTHH:mm:ss+05:30" (India Standard Time).
export function toIST(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
}

// The form stores area as free text ("1200", "1,200 sq ft", "Not sure").
function areaSqFt(area: unknown): number | undefined {
  if (typeof area === 'number' && Number.isFinite(area) && area > 0) return area;
  if (typeof area !== 'string') return undefined;
  const match = area.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function callGoogleSheet<T = unknown>(input: {
  action: string;
  actor: { id: string; email: string };
  data: unknown;
  requestId?: string;
}): Promise<T> {
  const url = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.GOOGLE_SCRIPT_SECRET;
  if (!url || !secret) throw new GoogleSheetError('Google Sheet connector is not configured.', 'CONFIGURATION');

  const timestamp = Date.now();
  const payload = JSON.stringify({
    action: input.action,
    actor: input.actor,
    data: input.data,
    ...(input.requestId ? { requestId: input.requestId } : {}),
  });
  const body = JSON.stringify({ timestamp, payload, signature: signSheetRequest(secret, timestamp, payload) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      // The script reads postData.contents, so text/plain avoids any browser-style
      // content-type negotiation while the body remains JSON.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    throw new GoogleSheetError(error instanceof Error ? error.message : 'Connector request failed.', 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new GoogleSheetError(`Connector responded with HTTP ${response.status}.`, 'HTTP');

  let parsed: { ok?: boolean; data?: T; error?: { code?: string; message?: string } };
  try {
    parsed = (await response.json()) as typeof parsed;
  } catch {
    throw new GoogleSheetError('Connector returned an unreadable response.', 'RESPONSE');
  }

  if (parsed?.ok !== true) {
    throw new GoogleSheetError(parsed?.error?.message ?? 'Connector rejected the request.', parsed?.error?.code ?? 'INTERNAL');
  }
  return parsed.data as T;
}

export function buildBookingRequest(
  order: MirrorOrder,
): { actor: { id: string; email: string }; data: Record<string, unknown>; requestId: string } | null {
  const email = order.user.email;
  if (!email) return null;

  const cleaningDetails = (order.items.find((item) => item.service.code === 'CLEANING')?.details ?? null) as Record<string, unknown> | null;
  const laundryDetails = (order.items.find((item) => item.service.code === 'LAUNDRY')?.details ?? null) as Record<string, unknown> | null;

  const service = order.cleaning && order.laundry ? 'BOTH' : order.cleaning ? 'CLEANING' : 'LAUNDRY';
  const cleaningAppointment = order.appointments.find((appointment) => appointment.kind === 'CLEANING');
  const pickupAppointment = order.appointments.find((appointment) => appointment.kind === 'PICKUP');

  const data: Record<string, unknown> = {
    service,
    contact: {
      fullName: order.customerName,
      mobile: order.user.phone ?? '',
      locality: order.address.locality,
      address: order.address.fullAddress,
      accessContact: order.address.accessContact,
      floorLift: order.address.floorLift,
      utilities: order.address.utilities,
      landmark: order.address.landmark ?? '',
    },
    schedule: {},
  };

  const schedule = data.schedule as Record<string, unknown>;

  if (order.cleaning && cleaningDetails) {
    data.cleaning = {
      propertyType: cleaningDetails.propertyType,
      furnishing: FURNISHING[String(cleaningDetails.furnishing)] ?? cleaningDetails.furnishing,
      bedrooms: cleaningDetails.bedrooms,
      bathrooms: cleaningDetails.bathrooms,
      areaSqFt: areaSqFt(cleaningDetails.area),
      type: cleaningDetails.cleaningType,
      additionalTasks: cleaningDetails.tasks ?? '',
      notes: cleaningDetails.notes ?? '',
    };
    schedule.cleaningStart = toIST(cleaningAppointment?.requestedStart);
  }

  if (order.laundry && laundryDetails) {
    const grams = typeof laundryDetails.weightGrams === 'number' ? laundryDetails.weightGrams : undefined;
    data.laundry = {
      service: LAUNDRY_TYPE[String(laundryDetails.type)] ?? laundryDetails.type,
      estimatedBags: laundryDetails.bags,
      estimatedKg: grams && grams > 0 ? grams / 1000 : undefined,
      handling: laundryDetails.instructions ?? '',
      collectDuringCleaning: Boolean(laundryDetails.collectDuringCleaning),
      returnTiming: laundryDetails.returnPreference ?? '',
    };
    schedule.pickupStart = toIST(pickupAppointment?.requestedStart);
  }

  return { actor: { id: order.userId, email }, data, requestId: order.requestKey };
}

export async function mirrorBookingToSheet(orderId: string): Promise<{ skipped?: boolean; bookingId?: string; replayed?: boolean }> {
  if (!isGoogleSheetConfigured()) return { skipped: true };

  const order = await db.order.findUnique({ where: { id: orderId }, include: mirrorInclude });
  if (!order) throw new GoogleSheetError('Booking not found for connector.', 'NOT_FOUND');

  const request = buildBookingRequest(order);
  if (!request) return { skipped: true };

  const result = await callGoogleSheet<{ bookingId: string; replayed?: boolean }>({
    action: 'createBooking',
    actor: request.actor,
    data: request.data,
    requestId: request.requestId,
  });

  // Remember the Sheet booking id so follow-ups can reference the same record.
  if (result?.bookingId) {
    await db.order.update({ where: { id: orderId }, data: { sheetBookingId: result.bookingId } }).catch(() => undefined);
  }

  return result;
}

// Bookings must succeed even when the connector is down or misconfigured, so the
// database remains the source of truth and Sheet failures are only logged. A failed
// mirror is queued in the shared outbox, which the cron retries without duplicates.
export async function mirrorBookingToSheetSafely(orderId: string, userId: string): Promise<void> {
  if (!isGoogleSheetConfigured()) return;
  try {
    await mirrorBookingToSheet(orderId);
  } catch (error) {
    console.error('[Google Sheet connector] booking mirror failed', { orderId, error });
    await enqueueSheetSync('SHEET_BOOKING', orderId, userId);
  }
}

// Queue a retryable connector job. `dedupeKey` keeps the outbox free of duplicates
// when the same record is synced more than once.
export async function enqueueSheetSync(kind: string, entityId: string, userId: string): Promise<void> {
  try {
    await db.outbox.upsert({
      where: { dedupeKey: `${kind}:${entityId}` },
      update: { status: 'PENDING', lockedUntil: null, nextAttemptAt: new Date() },
      create: { dedupeKey: `${kind}:${entityId}`, userId, kind, entityId },
    });
  } catch (error) {
    console.error('[Google Sheet connector] could not queue retry', { kind, entityId, error });
  }
}

const FOLLOWUP_KIND: Record<string, string> = {
  SUPPORT: 'Question',
  CHANGE_QUOTE: 'Quote change',
  CANCEL: 'Cancellation request',
  RESCHEDULE: 'Schedule request',
  COMPLAINT: 'Complaint',
  ISSUE: 'Issue',
};

// Mirrors a customer/staff request into the sheet's "Customer Followups" tab.
// Requires the parent booking to have been mirrored so both share a booking id.
export async function mirrorFollowupToSheet(supportId: string): Promise<{ skipped?: boolean }> {
  if (!isGoogleSheetConfigured()) return { skipped: true };

  const support = await db.supportRequest.findUnique({
    where: { id: supportId },
    include: { order: { select: { userId: true, sheetBookingId: true, user: { select: { email: true } } } } },
  });
  const bookingId = support?.order.sheetBookingId;
  const email = support?.order.user.email;
  if (!support || !bookingId || !email) return { skipped: true };

  await callGoogleSheet({
    action: 'addFollowup',
    actor: { id: support.order.userId, email },
    data: { bookingId, kind: FOLLOWUP_KIND[support.kind] ?? 'Question', message: support.message },
  });
  return {};
}

export async function mirrorFollowupToSheetSafely(supportId: string, userId: string): Promise<void> {
  if (!isGoogleSheetConfigured()) return;
  try {
    await mirrorFollowupToSheet(supportId);
  } catch (error) {
    console.error('[Google Sheet connector] followup mirror failed', { supportId, error });
    await enqueueSheetSync('SHEET_FOLLOWUP', supportId, userId);
  }
}

// Used by the outbox cron to replay a queued connector job.
export async function dispatchSheetSync(kind: string, entityId: string): Promise<void> {
  if (kind === 'SHEET_ORDER' || kind === 'SHEET_BOOKING') return syncOrderSnapshot(entityId);
  if(kind==='SHEET_FOLLOWUP'){const support=await db.supportRequest.findUniqueOrThrow({where:{id:entityId},select:{orderId:true}});return syncOrderSnapshot(support.orderId);}
  throw new GoogleSheetError(`Unsupported connector sync: ${kind}`, 'UNSUPPORTED');
}

// The connector validates a well-formed sender email on every action. Prefer an
// explicit connector address, otherwise fall back to an administrator's email.
export async function systemActor(): Promise<{ id: string; email: string }> {
  const configured = process.env.GOOGLE_SCRIPT_ACTOR_EMAIL;
  if (configured) return { id: 'connector-system', email: configured };
  const admin = await db.user.findFirst({ where: { role: 'ADMIN', email: { not: null } }, select: { id: true, email: true } });
  if (admin?.email) return { id: admin.id, email: admin.email };
  return { id: 'connector-system', email: 'connector@kleanurmind.in' };
}

export type SheetHealth = { configured: boolean; reachable: boolean; actionSupported: boolean; version?: string; error?: string };

// Diagnostic used by the private admin connector panel. Never call it from the browser UI.
export async function sheetHealth(): Promise<SheetHealth> {
  if (!isGoogleSheetConfigured()) return { configured: false, reachable: false, actionSupported: false };
  try {
    const data = await callGoogleSheet<{ version?: string }>({ action: 'health', actor: await systemActor(), data: {} });
    return { configured: true, reachable: true, actionSupported: true, version: data?.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connector error';
    const reachable = !(error instanceof GoogleSheetError && ['CONFIGURATION', 'NETWORK', 'HTTP', 'RESPONSE'].includes(error.code));
    const actionSupported = !/unsupported action/i.test(message);
    return { configured: true, reachable, actionSupported, error: message };
  }
}

// Explicit projection: no credentials, sessions, photos, or provider secrets.
export async function syncOrderSnapshot(orderId: string): Promise<void> {
  if (!isGoogleSheetConfigured()) throw new GoogleSheetError('Configure the private Sheets connector before retrying.', 'CONFIGURATION');
  const order = await db.order.findUniqueOrThrow({where:{id:orderId},include:{
    address:true,items:{include:{service:true}},cleaning:true,laundry:true,quotes:{include:{items:true}},
    appointments:{include:{assignments:true}},supports:true,
  }});
  const common={bookingId:order.id,customerId:order.userId};
  const details=(code:string)=>order.items.find(item=>item.service.code===code)?.details;
  const rows:Record<string,Array<Record<string,unknown>>>={
    Bookings:[{id:order.id,...common,name:order.customerName,mobile:order.customerPhone,email:order.customerEmail,status:order.status,locality:order.address.locality,address:order.address.fullAddress,landmark:order.address.landmark,accessContact:order.address.accessContact,floorLift:order.address.floorLift,utilities:order.address.utilities,service:order.cleaning&&order.laundry?'BOTH':order.cleaning?'CLEANING':'LAUNDRY',createdAt:order.createdAt}],
    Cleaning:order.cleaning?[{id:order.cleaning.id,...common,status:order.cleaning.status,details:details('CLEANING')}]:[],
    Laundry:order.laundry?[{id:order.laundry.id,...common,status:order.laundry.status,estimatedWeightGrams:order.laundry.estimatedWeightGrams,actualWeightGrams:order.laundry.actualWeightGrams,details:details('LAUNDRY')}]:[],
    Quotes:order.quotes.map(q=>({id:q.id,...common,version:q.version,status:q.status,totalPaise:q.totalPaise,discountPaise:q.discountPaise,taxPaise:q.taxPaise,deliveryPaise:q.deliveryPaise,inclusions:q.inclusions,exclusions:q.exclusions,items:q.items.map(i=>({description:i.description,quantity:i.quantity,unitPaise:i.unitPaise,totalPaise:i.totalPaise})),approvedAt:q.approvedAt,approvedById:q.approvedById})),
    Appointments:order.appointments.map(a=>({id:a.id,...common,kind:a.kind,confirmed:a.confirmed,requestedStart:toIST(a.requestedStart),requestedEnd:toIST(a.requestedEnd),start:toIST(a.start),end:toIST(a.end)})),
    'Staff Assignments':order.appointments.flatMap(a=>a.assignments.map(s=>({id:s.id,...common,appointmentId:a.id,staffId:s.staffId,active:s.active,start:toIST(s.start),end:toIST(s.end)}))),
    'Customer Followups':order.supports.map(s=>({id:s.id,...common,kind:s.kind,message:s.message,status:s.status,response:s.response,createdAt:s.createdAt})),
  };
  await callGoogleSheet({action:'syncSnapshot',actor:await systemActor(),data:{bookingId:order.id,rows},requestId:`snapshot:${order.id}:${crypto.randomUUID()}`});
}
