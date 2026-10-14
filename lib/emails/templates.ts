import { db } from '@/lib/db';
import { money, dateTime } from '@/lib/domain';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const BRAND_COLOR = '#facc15';
const INK_COLOR = '#0b1c30';
const MUTED_COLOR = '#526078';

function layout(title: string, preheader: string, content: string): { subject: string; html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9ff; color: ${INK_COLOR}; line-height: 1.6; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(11,28,48,0.08); }
    .header { background: ${BRAND_COLOR}; padding: 24px; text-align: center; }
    .header img { width: 48px; height: 48px; border-radius: 12px; background: white; padding: 4px; }
    .content { padding: 32px; }
    .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: ${INK_COLOR}; }
    .preheader { font-size: 14px; color: ${MUTED_COLOR}; margin: 0 0 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; margin: 0 0 12px; color: ${INK_COLOR}; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f2f7; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: ${MUTED_COLOR}; font-size: 14px; }
    .detail-value { font-weight: 600; color: ${INK_COLOR}; text-align: right; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-yellow { background: #fff0ad; color: #574500; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dce9ff; color: #1e40af; }
    .btn { display: inline-block; background: ${BRAND_COLOR}; color: ${INK_COLOR}; padding: 14px 28px; border-radius: 11px; font-weight: 600; text-decoration: none; text-align: center; }
    .btn:hover { background: #eab308; }
    .footer { padding: 24px 32px; background: #f8f9ff; border-top: 1px solid #f0f2f7; font-size: 12px; color: ${MUTED_COLOR}; text-align: center; }
    .footer a { color: ${MUTED_COLOR}; text-decoration: underline; }
    .divider { height: 1px; background: #f0f2f7; margin: 24px 0; }
    .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; font-size: 13px; color: #78350f; }
    .address-box { background: #f8f9ff; border-radius: 8px; padding: 16px; font-size: 14px; white-space: pre-line; }
    @media (max-width: 480px) { .content { padding: 24px 20px; } .title { font-size: 20px; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="white"/>
          <path d="M24 12L30 20H18L24 12Z" fill="${BRAND_COLOR}"/>
          <path d="M16 28L24 36L32 28" stroke="${BRAND_COLOR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 28L24 20L32 28" stroke="${BRAND_COLOR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="content">
        <h1 class="title">${escapeHtml(title)}</h1>
        <p class="preheader">${escapeHtml(preheader)}</p>
        ${content}
      </div>
      <div class="footer">
        <p>Klean Ur Mind \u00b7 Kozhikode, Kerala \u00b7 Prices in INR</p>
        <p><a href="${BASE_URL}/bookings">View your bookings</a> \u00b7 <a href="${BASE_URL}/sign-in">Sign in</a></p>
        <p style="margin-top: 16px;">This email was sent because you have a booking with us. <a href="${BASE_URL}/unsubscribe">Manage preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${title}\n\n${preheader}\n\n${stripHtml(content)}\n\n---\nKlean Ur Mind \u00b7 Kozhikode, Kerala\n${BASE_URL}/bookings`;

  return { subject: title, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&' + '#39;');
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getOrderDetails(entityId: string) {
  const order = await db.order.findUnique({
    where: { id: entityId },
    include: {
      address: true,
      supports: { orderBy: { createdAt: 'asc' } },
      cleaning: true,
      laundry: { include: { bags: true } },
      quotes: { include: { items: true }, orderBy: { version: 'desc' }, take: 1 },
      appointments: { include: { assignments: { include: { staff: { select: { name: true } } } } } },
      user: { select: { email: true, name: true } },
    },
  });
  return order;
}

export async function getTemplate(kind: string, entityId: string): Promise<{ subject: string; html: string; text: string }> {
  const order = await getOrderDetails(entityId);
  if (!order) {
    return layout('Klean Ur Mind', 'Booking not found', '<p>We couldn\'t find the booking details.</p>');
  }

  const customerName = order.user?.name || order.customerName || 'there';
  const bookingUrl = `${BASE_URL}/bookings/${order.id}`;

  switch (kind) {
    case 'REQUEST_RECEIVED': {
      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We've received your booking request for <strong>${escapeHtml(order.cleaning && order.laundry ? 'Home Cleaning + Laundry' : order.cleaning ? 'Home Cleaning' : 'Laundry Pickup & Return')}</strong> in ${escapeHtml(order.address.locality)}, Kozhikode.</p>
        <div class="section">
          <h2 class="section-title">What happens next</h2>
          <ol style="margin: 0; padding-left: 20px; color: ${MUTED_COLOR};">
            <li style="margin-bottom: 8px;">Our operations team reviews your requested scope and preferred times.</li>
            <li style="margin-bottom: 8px;">You'll receive an itemised quote with proposed appointments for your approval.</li>
            <li style="margin-bottom: 8px;">Once you approve, we confirm staff and appointments.</li>
          </ol>
        </div>
        <div class="notice">
          <strong>Reference:</strong> ${order.id}<br/>
          <strong>Status:</strong> <span class="badge badge-yellow">Quote being prepared</span>
        </div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Booking Details</a></p>
      `;
      return layout('Booking request received', 'Your quote is being prepared', content);
    }

    case 'QUOTE_READY': {
      const quote = order.quotes[0];
      if (!quote) {
        return layout('Quote ready', 'Your quote is available', '<p>Your quote is ready but we couldn\'t load details.</p>');
      }

      const itemsHtml = quote.items.map(item => `
        <div class="detail-row">
          <span class="detail-label">${escapeHtml(item.description)} (${item.quantity} \u00d7 ${money(item.unitPaise)})</span>
          <span class="detail-value">${money(item.totalPaise)}</span>
        </div>
      `).join('');

      let appointmentsHtml = '';
      if (quote.appointments) {
        try {
          const appointments = (typeof quote.appointments==='string'?JSON.parse(quote.appointments):quote.appointments) as Array<{ kind: string; start: string; end: string }>;
          appointmentsHtml = appointments.map(a => `
            <div class="detail-row">
              <span class="detail-label">${a.kind.charAt(0) + a.kind.slice(1).toLowerCase()}</span>
              <span class="detail-value">${dateTime(a.start)} \u2013 ${dateTime(a.end)}</span>
            </div>
          `).join('');
        } catch {}
      }

      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your itemised quote for <strong>${escapeHtml(order.cleaning && order.laundry ? 'Home Cleaning + Laundry' : order.cleaning ? 'Home Cleaning' : 'Laundry Pickup & Return')}</strong> is ready for review.</p>
        <div class="section">
          <h2 class="section-title">Cost Breakdown</h2>
          ${itemsHtml}
          <div class="detail-row">
            <span class="detail-label">Pickup / delivery charges</span>
            <span class="detail-value">${money(quote.deliveryPaise)}</span>
          </div>
          ${quote.taxBps !== null ? `
            <div class="detail-row">
              <span class="detail-label">Tax (${quote.taxBps / 100}%)</span>
              <span class="detail-value">${money(quote.taxPaise)}</span>
            </div>
          ` : ''}
          <div class="detail-row" style="font-size: 16px; border-top: 2px solid ${BRAND_COLOR}; padding-top: 12px; margin-top: 8px;">
            <span class="detail-label">Total</span>
            <span class="detail-value">${money(quote.totalPaise)}</span>
          </div>
        </div>
        ${appointmentsHtml ? `
          <div class="section">
            <h2 class="section-title">Proposed Appointments (IST)</h2>
            ${appointmentsHtml}
            <p class="notice" style="margin-top: 16px;">Appointments are proposed times. Our team will confirm availability after your approval.</p>
          </div>
        ` : ''}
        <div class="section">
          <h2 class="section-title">Scope of Work</h2>
          <div class="address-box"><strong>Included:</strong>\n${escapeHtml(quote.inclusions)}</div>
          <div class="address-box" style="margin-top: 12px;"><strong>Excluded:</strong>\n${escapeHtml(quote.exclusions)}</div>
        </div>
        <div class="notice">
          <strong>Quote version:</strong> ${quote.version}<br/>
          <strong>Next step:</strong> Review the scope and proposed appointments
        </div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">Review & Approve Quote</a></p>
        <p style="font-size: 13px; color: ${MUTED_COLOR}; text-align: center; margin-top: 16px;">No payment is collected now. You approve the exact scope and charges before we confirm.</p>
      `;
      return layout(`Quote ready: ${money(quote.totalPaise)}`, `Your quote for ${order.address.locality} is ready`, content);
    }

    case 'QUOTE_APPROVED': {
      const quote = order.quotes[0];
      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Thank you for approving the quote for your <strong>${escapeHtml(order.cleaning && order.laundry ? 'Home Cleaning + Laundry' : order.cleaning ? 'Home Cleaning' : 'Laundry Pickup & Return')}</strong>.</p>
        <div class="notice">
          <strong>Approved amount:</strong> ${quote ? money(quote.totalPaise) : 'N/A'}<br/>
          <strong>Status:</strong> <span class="badge badge-green">Approved</span>
        </div>
        <p>Our operations team is now confirming staff and appointment times. You'll receive a confirmation once everything is locked in.</p>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Booking</a></p>
      `;
      return layout('Quote approved', 'Operations will confirm your appointments', content);
    }

    case 'APPOINTMENT_CONFIRMED': {
      const confirmedAppointments = order.appointments.filter(a => a.confirmed);
      const appointmentsHtml = confirmedAppointments.map(a => `
        <div class="section">
          <h2 class="section-title">${a.kind.charAt(0) + a.kind.slice(1).toLowerCase()} Appointment Confirmed</h2>
          <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${dateTime(a.start!)} \u2013 ${dateTime(a.end!)}</span></div>
          ${a.assignments.filter(s => s.active).length > 0 ? `
            <div class="detail-row"><span class="detail-label">Assigned to</span><span class="detail-value">${a.assignments.filter(s => s.active).map(s => s.staff.name).join(', ')}</span></div>
          ` : ''}
        </div>
      `).join('');

      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your appointment(s) for <strong>${escapeHtml(order.cleaning && order.laundry ? 'Home Cleaning + Laundry' : order.cleaning ? 'Home Cleaning' : 'Laundry Pickup & Return')}</strong> have been confirmed.</p>
        ${appointmentsHtml}
        <div class="notice">
          <strong>Address:</strong><br/>${escapeHtml(order.address.fullAddress)}, ${escapeHtml(order.address.locality)}<br/>
          <strong>Access contact:</strong> ${escapeHtml(order.address.accessContact)}
        </div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Booking Details</a></p>
      `;
      return layout('Appointments confirmed', 'Your service times are locked in', content);
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

      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your ${track === 'cleaning' ? 'home cleaning' : 'laundry'} service status has been updated:</p>
        <div class="section">
          <div class="detail-row" style="font-size: 18px; border: none; padding: 16px 0;">
            <span class="detail-label">Current status</span>
            <span class="detail-value"><span class="badge badge-blue">${statusLabels[status] || status}</span></span>
          </div>
        </div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">Track Progress</a></p>
      `;
      return layout(`${statusLabels[status] || 'Status update'} - Klean Ur Mind`, `Your ${track} service is ${statusLabels[status]?.toLowerCase() || 'updated'}`, content);
    }

    case 'SUPPORT_OPEN': {
      const support = order.supports[order.supports.length - 1];
      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We've received your support request regarding your booking in ${escapeHtml(order.address.locality)}.</p>
        <div class="section">
          <h2 class="section-title">Your message</h2>
          <div class="address-box">${escapeHtml(support?.message || 'No message')}</div>
        </div>
        <div class="notice">Our team will review your request and respond in your booking.</div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Conversation</a></p>
      `;
      return layout('Support request received', 'We\'ll get back to you soon', content);
    }

    case 'SUPPORT_RESOLVED': {
      const support = order.supports[order.supports.length - 1];
      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your support request has been resolved.</p>
        <div class="section">
          <h2 class="section-title">Response</h2>
          <div class="address-box">${escapeHtml(support?.response || 'No response provided')}</div>
        </div>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Conversation</a></p>
      `;
      return layout('Support request resolved', 'Your issue has been addressed', content);
    }

    default: {
      const content = `
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>You have an update on your booking for ${escapeHtml(order.address.locality)}.</p>
        <p style="text-align: center; margin-top: 32px;"><a href="${bookingUrl}" class="btn">View Booking</a></p>
      `;
      return layout('Booking update', 'Check your booking for details', content);
    }
  }
}