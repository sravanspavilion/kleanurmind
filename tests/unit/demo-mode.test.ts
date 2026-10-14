import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isDemoMode, DEMO_LABEL } from '@/lib/demo/mode';
import { demoActorFor, demoCustomer, demoAdmin, demoStaff, DEMO_CUSTOMER_ID } from '@/lib/demo/actor';
import { demoServices, demoOrders, getServiceContent } from '@/lib/demo/fixtures';
import { getBookings, getOrder, getServiceContent as facadeService, findServiceArea, getAdminOrders, getDashboardOrders } from '@/lib/data';
import { POST as registerPost } from '@/app/api/register/route';

const original = { DEMO_MODE: process.env.DEMO_MODE, NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE };

beforeEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
});
afterEach(() => {
  if (original.DEMO_MODE === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = original.DEMO_MODE;
  if (original.NEXT_PUBLIC_DEMO_MODE === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE; else process.env.NEXT_PUBLIC_DEMO_MODE = original.NEXT_PUBLIC_DEMO_MODE;
});

describe('demo mode flag', () => {
  it('is off unless DEMO_MODE (or NEXT_PUBLIC_DEMO_MODE) is enabled', () => {
    expect(isDemoMode()).toBe(false);
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    process.env.DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
    expect(DEMO_LABEL).toBe('Demo — sample data');
  });
});

describe('demo identities', () => {
  it('selects a customer, administrator or staff identity by requested role', () => {
    expect(demoActorFor()).toBe(demoCustomer);
    expect(demoActorFor(['CUSTOMER', 'ADMIN'])).toBe(demoCustomer);
    expect(demoActorFor(['ADMIN'])).toBe(demoAdmin);
    expect(demoActorFor(['CLEANER', 'LAUNDRY', 'DELIVERY', 'PARTNER'])).toBe(demoStaff);
    expect(demoActorFor(['UNKNOWN_ROLE'])).toBe(demoStaff);
  });
});

describe('demo fixtures', () => {
  it('mirrors the seed services and a spread of order statuses', () => {
    expect(demoServices.map(s => s.code).sort()).toEqual(['CLEANING', 'LAUNDRY']);
    expect(getServiceContent('CLEANING')?.inclusions).toContain('Kitchen');
    expect(demoOrders.length).toBeGreaterThanOrEqual(12);
    expect(new Set(demoOrders.map(o => o.status)).size).toBeGreaterThan(3);
    expect(demoOrders.filter(o => o.userId === DEMO_CUSTOMER_ID).length).toBeGreaterThan(0);
  });
});

describe('demo data facade', () => {
  beforeEach(() => { process.env.DEMO_MODE = 'true'; });

  it('serves fixture data without a database connection', async () => {
    const service = await facadeService('LAUNDRY');
    expect(service?.exclusions).toContain('Dry cleaning');

    const bookings = await getBookings(DEMO_CUSTOMER_ID, 'upcoming', 1);
    expect(bookings.count).toBe(bookings.orders.length);
    expect(bookings.orders.every(o => o.userId === DEMO_CUSTOMER_ID)).toBe(true);

    const dashboard = await getDashboardOrders(DEMO_CUSTOMER_ID);
    expect(dashboard.length).toBeGreaterThan(0);

    const area = await findServiceArea('Mananchira');
    expect(area?.active).toBe(true);

    const admin = await getAdminOrders({ page: 1 });
    expect(admin.length).toBeLessThanOrEqual(12);
  });

  it('returns a demo order and reports a missing one as not found', async () => {
    const order = await getOrder(demoAdmin, 'demo-order-1');
    expect(order.id).toBe('demo-order-1');
    await expect(getOrder(demoAdmin, 'missing-order')).rejects.toMatchObject({ status: 404 });
  });
});

describe('demo API guards', () => {
  beforeEach(() => { process.env.DEMO_MODE = 'true'; });

  it('blocks real account creation', async () => {
    const response = await registerPost(new Request('http://localhost/api/register', { method: 'POST', body: JSON.stringify({ name: 'x', email: 'x@example.test', password: 'password123' }) }));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('demo');
  });
});
