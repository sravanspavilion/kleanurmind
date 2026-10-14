import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({ db: { order: { findUniqueOrThrow: vi.fn() } } }));
import { db } from '@/lib/db';

import {
  syncOrderSnapshot,
  buildBookingRequest,
  isGoogleSheetConfigured,
  signSheetRequest,
  toIST,
} from '@/lib/integrations/google-sheet';

type BookingData = {
  service: string;
  schedule: Record<string, unknown>;
  contact: Record<string, unknown>;
  cleaning?: Record<string, unknown>;
  laundry?: Record<string, unknown>;
};

describe('Google Sheets connector contracts', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SCRIPT_URL;
    delete process.env.GOOGLE_SCRIPT_SECRET;
  });

  it('signs "timestamp.payload" with HMAC-SHA256 like the Apps Script', () => {
    // Recomputed independently against Utilities.computeHmacSha256Signature semantics.
    const payload = JSON.stringify({ action: 'createBooking' });
    expect(signSheetRequest('test-secret', 1700000000000, payload)).toBe(
      '3914f5eba898cd468082cffbe33be9419f78803f9dbb7dd2d2d4fb9bad8db9be',
    );
  });

  it('formats requested appointments as IST with the +05:30 offset the script requires', () => {
    expect(toIST(new Date('2024-01-01T00:00:00.000Z'))).toBe('2024-01-01T05:30:00+05:30');
    expect(toIST(null)).toBeUndefined();
  });

  it('is only configured when both the URL and secret are set', () => {
    expect(isGoogleSheetConfigured()).toBe(false);
    process.env.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/example/exec';
    expect(isGoogleSheetConfigured()).toBe(false);
    process.env.GOOGLE_SCRIPT_SECRET = 'secret';
    expect(isGoogleSheetConfigured()).toBe(true);
  });

  it('maps a cleaning booking to the createBooking payload', () => {
    const order = {
      userId: 'user-1',
      customerName: 'Asha Menon',
      requestKey: '11111111-2222-4333-8444-555555555555',
      address: {
        locality: 'Mananchira',
        fullAddress: '12 Test Road',
        landmark: 'Near park',
        accessContact: 'Asha +91 90000 00000',
        floorLift: 'Ground floor',
        utilities: 'Water and electricity',
      },
      cleaning: { id: 'clean-1' },
      laundry: null,
      items: [
        {
          service: { code: 'CLEANING' },
          details: {
            propertyType: 'Apartment',
            furnishing: 'FURNISHED',
            bedrooms: 2,
            bathrooms: 2,
            area: '1,200 sq ft',
            cleaningType: 'Deep cleaning',
            tasks: 'Kitchen and bathrooms',
            notes: '',
          },
        },
      ],
      appointments: [{ kind: 'CLEANING', requestedStart: new Date('2024-01-01T06:30:00.000Z') }],
      user: { email: 'asha@example.test', phone: '+919000000000' },
    };

    const request = buildBookingRequest(order as never);
    expect(request).not.toBeNull();
    const data = request!.data as BookingData;

    expect(request!.requestId).toBe(order.requestKey);
    expect(request!.actor).toEqual({ id: 'user-1', email: 'asha@example.test' });
    expect(data.service).toBe('CLEANING');
    expect(data.schedule).toEqual({ cleaningStart: '2024-01-01T12:00:00+05:30' });
    expect(data.cleaning).toMatchObject({
      propertyType: 'Apartment',
      furnishing: 'Furnished',
      bedrooms: 2,
      bathrooms: 2,
      areaSqFt: 1200,
      type: 'Deep cleaning',
      additionalTasks: 'Kitchen and bathrooms',
    });
    expect(data.laundry).toBeUndefined();
  });

  it('maps a combined booking and skips orders without a verified email', () => {
    const order = {
      userId: 'user-2',
      customerName: 'Ravi',
      requestKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      address: {
        locality: 'Kallai',
        fullAddress: '5 Road',
        landmark: null,
        accessContact: 'Ravi',
        floorLift: '1st floor',
        utilities: 'Yes',
      },
      cleaning: { id: 'clean-2' },
      laundry: { id: 'wash-2' },
      items: [
        { service: { code: 'CLEANING' }, details: { propertyType: 'Villa', furnishing: 'EMPTY', bedrooms: 3, bathrooms: 3, area: 'Not sure', cleaningType: 'Regular cleaning', tasks: '', notes: '' } },
        { service: { code: 'LAUNDRY' }, details: { type: 'WASH_IRON', bags: 2, weightGrams: 5000, instructions: 'Delicates', returnPreference: 'Evening', collectDuringCleaning: false } },
      ],
      appointments: [
        { kind: 'CLEANING', requestedStart: new Date('2024-02-01T04:00:00.000Z') },
        { kind: 'PICKUP', requestedStart: new Date('2024-02-01T04:00:00.000Z') },
      ],
      user: { email: 'ravi@example.test', phone: null },
    };

    const request = buildBookingRequest(order as never);
    const data = request!.data as BookingData;

    expect(data.service).toBe('BOTH');
    expect(data.cleaning).toMatchObject({ furnishing: 'Empty' });
    expect(data.cleaning!.areaSqFt).toBeUndefined();
    expect(data.laundry).toMatchObject({ service: 'Wash & Iron', estimatedBags: 2, estimatedKg: 5, collectDuringCleaning: false });

    expect(buildBookingRequest({ ...order, user: { email: null, phone: null } } as never)).toBeNull();
  });
});


describe('complete service request snapshot', () => {
  it('sends address instructions and all entered service details to Sheets', async () => {
    vi.stubEnv('GOOGLE_SCRIPT_URL', 'https://example.test/sheet');
    vi.stubEnv('GOOGLE_SCRIPT_SECRET', 'test-secret');
    vi.stubEnv('GOOGLE_SCRIPT_ACTOR_EMAIL', 'connector@example.test');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    const cleaning = { tasks: 'Clean balcony', notes: 'Bring supplies', area: 'Not sure' };
    const laundry = { bags: 2, instructions: 'Delicates', returnPreference: 'Evening', collectDuringCleaning: true };
    vi.mocked(db.order.findUniqueOrThrow).mockResolvedValue({
      id: 'order-1', userId: 'user-1', customerName: 'Asha', customerPhone: '9000000000', customerEmail: 'asha@example.test', status: 'REQUESTED',
      address: { locality: 'Kallai', fullAddress: '5 Road', landmark: 'Park', accessContact: 'Asha', floorLift: 'First floor', utilities: 'Available' },
      items: [{ service: { code: 'CLEANING' }, details: cleaning }, { service: { code: 'LAUNDRY' }, details: laundry }],
      cleaning: { id: 'clean-1', status: 'REQUESTED' }, laundry: { id: 'laundry-1', status: 'REQUESTED' },
      quotes: [], appointments: [], supports: [],
    } as never);
    try {
      await syncOrderSnapshot('order-1');
      const envelope = JSON.parse(fetchMock.mock.calls[0][1].body);
      const request = JSON.parse(envelope.payload);
      expect(request.action).toBe('syncSnapshot');
      expect(request.data.rows.Bookings[0]).toMatchObject({ mobile: '9000000000', service: 'BOTH', accessContact: 'Asha', floorLift: 'First floor', utilities: 'Available', landmark: 'Park' });
      expect(request.data.rows.Cleaning[0].details).toEqual(cleaning);
      expect(request.data.rows.Laundry[0].details).toEqual(laundry);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
