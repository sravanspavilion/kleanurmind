import type { SmsProvider } from '../providers';
import type twilio from 'twilio';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

let twilioClient: ReturnType<typeof twilio> | null = null;

async function getTwilioClient() {
  if (!twilioClient) {
    const config = getTwilioConfig();
    if (!config) {
      throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.');
    }
    const twilio = await import('twilio');
    twilioClient = twilio.default(config.accountSid, config.authToken);
  }
  return twilioClient;
}

export const smsProvider: SmsProvider = {
  sendDirect: sendSmsDirect,
  isConfigured: isSmsConfigured,
  async send(input) {
    const config = getTwilioConfig();
    if (!config) {
      if (process.env.NODE_ENV !== 'production' && process.env.NOTIFICATION_PROVIDER === 'development') {
        console.log('[DEV SMS]', { to: input.userId, kind: input.kind, entityId: input.entityId });
        return { status: 'SIMULATED', reference: input.idempotencyKey };
      }
      throw new Error('SMS provider not configured');
    }

    const { body } = await renderSms(input.kind, input.entityId);
    const client = await getTwilioClient();

    // input.userId should be a phone number in E.164 format
    await client.messages.create({
      body,
      from: config.fromNumber,
      to: input.userId,
    });

    return { status: 'DELIVERED', reference: input.idempotencyKey };
  },
};

async function renderSms(kind: string, entityId: string): Promise<{ body: string }> {
  const { db } = await import('@/lib/db');
  const { dateTime, money } = await import('@/lib/domain');

  const order = await db.order.findUnique({
    where: { id: entityId },
    include: {
      address: true,
      cleaning: true,
      laundry: true,
      quotes: { orderBy: { version: 'desc' }, take: 1 },
      appointments: { where: { confirmed: true }, take: 3 },
      user: { select: { phone: true } },
    },
  });

  if (!order) {
    return { body: 'Klean Ur Mind: Booking update. Check your app for details.' };
  }

  const quote = order.quotes[0];
  const locality = order.address.locality;

  switch (kind) {
    case 'QUOTE_READY': {
      const amount = quote ? money(quote.totalPaise) : 'pending';
      return { body: `Klean Ur Mind: Your quote for ${locality} is ready (${amount}). Approve at ${process.env.NEXTAUTH_URL}/bookings/${order.id} ` };
    }
    case 'QUOTE_APPROVED': {
      return { body: `Klean Ur Mind: Quote approved for ${locality}. We're confirming your appointments now.` };
    }
    case 'APPOINTMENT_CONFIRMED': {
      const appt = order.appointments[0];
      if (appt) {
        return { body: `Klean Ur Mind: Your ${appt.kind.toLowerCase()} on ${dateTime(appt.start!)} is confirmed for ${locality}. Details: ${process.env.NEXTAUTH_URL}/bookings/${order.id}` };
      }
      return { body: `Klean Ur Mind: Appointments confirmed for ${locality}. Check ${process.env.NEXTAUTH_URL}/bookings/${order.id}` };
    }
    case 'JOB_STATUS_CHANGED': {
      const cleaningStatus = order.cleaning?.status;
      const laundryStatus = order.laundry?.status;
      const status = cleaningStatus || laundryStatus || order.status;
      const track = cleaningStatus ? 'cleaning' : 'laundry';

      const statusLabels: Record<string, string> = {
        'ON_THE_WAY': 'on the way',
        'IN_PROGRESS': 'in progress',
        'COMPLETED': 'completed',
        'PICKUP_SCHEDULED': 'pickup scheduled',
        'COLLECTED': 'collected',
        'OUT_FOR_DELIVERY': 'out for delivery',
        'DELIVERED': 'delivered',
      };

      return { body: `Klean Ur Mind: Your ${track} for ${locality} is ${statusLabels[status] || status}. Track: ${process.env.NEXTAUTH_URL}/bookings/${order.id}` };
    }
    case 'SUPPORT_RESOLVED': {
      return { body: `Klean Ur Mind: Your support request for ${locality} has been resolved. Check ${process.env.NEXTAUTH_URL}/bookings/${order.id}` };
    }
    default: {
      return { body: `Klean Ur Mind: Update on your booking for ${locality}. Details: ${process.env.NEXTAUTH_URL}/bookings/${order.id}` };
    }
  }
}

export async function sendSmsDirect(to: string, kind: string, entityId: string): ReturnType<SmsProvider['sendDirect']> {
  const config = getTwilioConfig();
  if (!config) {
    if (process.env.NODE_ENV !== 'production' && process.env.NOTIFICATION_PROVIDER === 'development') {
      console.log('[DEV SMS DIRECT]', { to, kind, entityId });
      return { status: 'SIMULATED', reference: `direct-${Date.now()}` };
    }
    throw new Error('SMS provider not configured');
  }

  const { body } = await renderSms(kind, entityId);
  const client = await getTwilioClient();

  await client.messages.create({
    body,
    from: config.fromNumber,
    to,
  });

  return { status: 'DELIVERED', reference: `direct-${Date.now()}` };
}

export function isSmsConfigured(): boolean {
  return getTwilioConfig() !== null;
}
