import { createTransport, type Transporter } from 'nodemailer';
import type { NotificationProvider } from '../providers';

export interface EmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
  replyTo?: string;
}

function getConfig(): EmailProviderConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'Klean Ur Mind <noreply@kleanurmind.in>';

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, secure: port === 465, auth: { user, pass }, from };
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config = getConfig();
    if (!config) {
      throw new Error('Email not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
    }
    transporter = createTransport(config);
  }
  return transporter;
}

export const emailProvider: NotificationProvider = {
  async send(input) {
    const config = getConfig();
    if (!config) {
      if (process.env.NODE_ENV !== 'production' && process.env.NOTIFICATION_PROVIDER === 'development') {
        console.log('[DEV EMAIL]', { to: input.userId, kind: input.kind, entityId: input.entityId });
        return { status: 'SIMULATED', reference: input.idempotencyKey };
      }
      throw new Error('Email provider not configured');
    }

    const { subject, html, text } = await renderEmail(input.kind, input.entityId);
    const tx = getTransporter();

    await tx.sendMail({
      from: config.from,
      replyTo: config.replyTo,
      to: input.userId, // This should be an email address - we'll resolve it
      subject,
      html,
      text,
    });

    return { status: 'DELIVERED', reference: input.idempotencyKey };
  },
};

async function renderEmail(kind: string, entityId: string): Promise<{ subject: string; html: string; text: string }> {
  // Import templates dynamically
  const { getTemplate } = await import('../emails/templates');
  return getTemplate(kind, entityId);
}

export async function sendEmailDirect(to: string, kind: string, entityId: string) {
  const config = getConfig();
  if (!config) {
    if (process.env.NODE_ENV !== 'production' && process.env.NOTIFICATION_PROVIDER === 'development') {
      console.log('[DEV EMAIL DIRECT]', { to, kind, entityId });
      return { status: 'SIMULATED', reference: `direct-${Date.now()}` };
    }
    throw new Error('Email provider not configured');
  }

  const { subject, html, text } = await renderEmail(kind, entityId);
  const tx = getTransporter();

  await tx.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject,
    html,
    text,
  });

  return { status: 'DELIVERED', reference: `direct-${Date.now()}` };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}