export interface PaymentProvider {
  createPayment(input: { orderId: string; amountPaise: number; idempotencyKey: string }): Promise<{ reference: string; url: string }>;
  verifyCallback(rawBody: string, signature: string): Promise<{ eventId: string; reference: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED'; amountPaise: number }>;
  refund(input: { reference: string; amountPaise: number; idempotencyKey: string }): Promise<{ reference: string; status: 'PENDING' | 'SUCCEEDED' }>;
}

export interface NotificationProvider {
  send(input: { idempotencyKey: string; userId: string; kind: string; entityId: string }): Promise<{ status: 'DELIVERED' | 'SIMULATED'; reference: string }>;
}

export interface EmailProvider extends NotificationProvider {
  sendDirect(to: string, kind: string, entityId: string): Promise<{ status: 'DELIVERED' | 'SIMULATED'; reference: string }>;
  isConfigured(): boolean;
}

export interface SmsProvider extends NotificationProvider {
  sendDirect(to: string, kind: string, entityId: string): Promise<{ status: 'DELIVERED' | 'SIMULATED'; reference: string }>;
  isConfigured(): boolean;
}

export const payments: PaymentProvider = {
  async createPayment() { throw new Error('Payment provider needs configuration.'); },
  async verifyCallback() { throw new Error('No payment callback provider is enabled.'); },
  async refund() { throw new Error('Refund provider needs configuration.'); },
};

// Lazy-loaded providers
let emailProviderInstance: EmailProvider | null = null;
let smsProviderInstance: SmsProvider | null = null;

async function getEmailProvider(): Promise<EmailProvider> {
  if (!emailProviderInstance) {
    const { emailProvider } = await import('./providers/email');
    emailProviderInstance = emailProvider;
  }
  return emailProviderInstance;
}

async function getSmsProvider(): Promise<SmsProvider> {
  if (!smsProviderInstance) {
    const { smsProvider } = await import('./providers/sms');
    smsProviderInstance = smsProvider;
  }
  return smsProviderInstance;
}

export const notifications: NotificationProvider = {
  async send(input) {
    // In development, simulate if no providers configured
    const isDev = process.env.NODE_ENV !== 'production' && process.env.NOTIFICATION_PROVIDER === 'development';

    // Try to send email (userId is email for email provider)
    let emailResult: { status: 'DELIVERED' | 'SIMULATED'; reference: string } | null = null;
    try {
      const emailProvider = await getEmailProvider();
      if (emailProvider.isConfigured() || isDev) {
        emailResult = await emailProvider.send(input);
      }
    } catch (e) {
      console.error('[Email send failed]', e);
    }

    // Try to send SMS (would need phone number - for now skip in combined provider)
    // SMS is sent via separate direct calls where we have the phone number

    if (emailResult) return emailResult;
    if (isDev) return { status: 'SIMULATED', reference: input.idempotencyKey };
    throw new Error('No notification provider configured');
  },
};

// Helper to send via both email and SMS when we have both contacts
export async function sendNotification(userId: string, kind: string, entityId: string, contacts: { email?: string; phone?: string }) {
  const idempotencyKey = `${kind}:${entityId}:${userId}`;
  const results: Array<{ channel: string; status: string }> = [];

  if (contacts.email) {
    try {
      const emailProvider = await getEmailProvider();
      const result = await emailProvider.sendDirect(contacts.email, kind, entityId);
      results.push({ channel: 'email', status: result.status });
    } catch (e) {
      console.error('[Email notification failed]', e);
      results.push({ channel: 'email', status: 'FAILED' });
    }
  }

  if (contacts.phone) {
    try {
      const smsProvider = await getSmsProvider();
      const result = await smsProvider.sendDirect(contacts.phone, kind, entityId);
      results.push({ channel: 'sms', status: result.status });
    } catch (e) {
      console.error('[SMS notification failed]', e);
      results.push({ channel: 'sms', status: 'FAILED' });
    }
  }

  return results;
}

export function isEmailConfigured(): boolean {
  // Sync check - used for UI
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}

export function isSmsConfigured(): boolean {
  return !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_FROM_NUMBER;
}