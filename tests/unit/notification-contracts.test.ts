import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: { order: { findUnique: vi.fn().mockResolvedValue(null) } },
}));

import { getTemplate } from '@/lib/emails/templates';
import { emailProvider, isEmailConfigured, sendEmailDirect } from '@/lib/providers/email';
import { smsProvider, isSmsConfigured, sendSmsDirect } from '@/lib/providers/sms';

describe('Notification provider contracts', () => {
  it('includes a subject and both message formats when a booking is missing', async () => {
    const message = await getTemplate('REQUEST_RECEIVED', 'missing');
    expect(message.subject).toBe('Klean Ur Mind');
    expect(message.html).toContain('Booking not found');
    expect(message.text).toContain('Booking not found');
  });

  it('exposes the direct delivery and configuration methods used by the dispatcher', () => {
    expect(emailProvider.sendDirect).toBe(sendEmailDirect);
    expect(emailProvider.isConfigured).toBe(isEmailConfigured);
    expect(smsProvider.sendDirect).toBe(sendSmsDirect);
    expect(smsProvider.isConfigured).toBe(isSmsConfigured);
  });
});
