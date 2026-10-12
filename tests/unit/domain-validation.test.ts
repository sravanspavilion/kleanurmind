import { describe, it, expect } from 'vitest';
import { transition, orderFinished, canRead, requireAdmin, calculateQuote, refundAvailable, exactQuote, money, human, dateTime, localToISO } from '@/lib/domain';
import { DomainError } from '@/lib/domain';
import { bookingSchema, quoteSchema, assignmentSchema, proposedSchema } from '@/lib/validation';
import { z } from 'zod';

describe('Domain Functions', () => {
  describe('transition', () => {
    it('should allow valid cleaning transitions', () => {
      expect(() => transition('cleaning', 'REQUESTED', 'CONFIRMED')).not.toThrow();
      expect(() => transition('cleaning', 'CONFIRMED', 'ASSIGNED')).not.toThrow();
      expect(() => transition('cleaning', 'ASSIGNED', 'ON_THE_WAY')).not.toThrow();
      expect(() => transition('cleaning', 'ON_THE_WAY', 'IN_PROGRESS')).not.toThrow();
      expect(() => transition('cleaning', 'IN_PROGRESS', 'COMPLETED')).not.toThrow();
    });

    it('should allow valid laundry transitions', () => {
      expect(() => transition('laundry', 'REQUESTED', 'PICKUP_SCHEDULED')).not.toThrow();
      expect(() => transition('laundry', 'PICKUP_SCHEDULED', 'COLLECTED')).not.toThrow();
      expect(() => transition('laundry', 'COLLECTED', 'AWAITING_PRICE_APPROVAL')).not.toThrow();
      expect(() => transition('laundry', 'AWAITING_PRICE_APPROVAL', 'PROCESSING')).not.toThrow();
      expect(() => transition('laundry', 'PROCESSING', 'QUALITY_CHECKED')).not.toThrow();
      expect(() => transition('laundry', 'QUALITY_CHECKED', 'OUT_FOR_DELIVERY')).not.toThrow();
      expect(() => transition('laundry', 'OUT_FOR_DELIVERY', 'DELIVERED')).not.toThrow();
    });

    it('should allow ISSUE from any non-terminal state', () => {
      expect(() => transition('cleaning', 'IN_PROGRESS', 'ISSUE')).not.toThrow();
      expect(() => transition('laundry', 'PROCESSING', 'ISSUE')).not.toThrow();
    });

    it('should allow CANCELLED from any non-terminal state', () => {
      expect(() => transition('cleaning', 'ASSIGNED', 'CANCELLED')).not.toThrow();
      expect(() => transition('laundry', 'COLLECTED', 'CANCELLED')).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      expect(() => transition('cleaning', 'REQUESTED', 'COMPLETED')).toThrow(DomainError);
      expect(() => transition('laundry', 'REQUESTED', 'DELIVERED')).toThrow(DomainError);
    });

    it('should throw for transitions from terminal states', () => {
      expect(() => transition('cleaning', 'COMPLETED', 'ISSUE')).toThrow(DomainError);
      expect(() => transition('laundry', 'DELIVERED', 'CANCELLED')).toThrow(DomainError);
    });

    it('should throw for transitions from ISSUE to non-CANCELLED', () => {
      expect(() => transition('cleaning', 'ISSUE', 'IN_PROGRESS')).toThrow(DomainError);
    });
  });

  describe('orderFinished', () => {
    it('should return true when both cleaning and laundry are complete', () => {
      expect(orderFinished('COMPLETED', 'DELIVERED')).toBe(true);
    });

    it('should return true when only cleaning exists and is complete', () => {
      expect(orderFinished('COMPLETED', null)).toBe(true);
    });

    it('should return true when only laundry exists and is complete', () => {
      expect(orderFinished(null, 'DELIVERED')).toBe(true);
    });

    it('should return false when cleaning is not complete', () => {
      expect(orderFinished('IN_PROGRESS', 'DELIVERED')).toBe(false);
    });

    it('should return false when laundry is not complete', () => {
      expect(orderFinished('COMPLETED', 'PROCESSING')).toBe(false);
    });
  });

  describe('canRead', () => {
    const admin: any = { id: 'admin1', role: 'ADMIN' };
    const customer: any = { id: 'customer1', role: 'CUSTOMER' };
    const staff: any = { id: 'staff1', role: 'CLEANER' };

    it('should allow admin to read any order', () => {
      expect(canRead(admin, 'customer1')).toBe(true);
    });

    it('should allow customer to read own order', () => {
      expect(canRead(customer, 'customer1')).toBe(true);
    });

    it('should not allow customer to read other orders', () => {
      expect(canRead(customer, 'customer2')).toBe(false);
    });

    it('should allow assigned staff to read order', () => {
      expect(canRead(staff, 'customer1', ['staff1'])).toBe(true);
    });

    it('should not allow unassigned staff to read order', () => {
      expect(canRead(staff, 'customer1', ['staff2'])).toBe(false);
    });
  });

  describe('requireAdmin', () => {
    it('should not throw for admin', () => {
      expect(() => requireAdmin({ id: '1', role: 'ADMIN' })).not.toThrow();
    });

    it('should throw for non-admin', () => {
      expect(() => requireAdmin({ id: '1', role: 'CUSTOMER' })).toThrow(DomainError);
      expect(() => requireAdmin({ id: '1', role: 'CLEANER' })).toThrow(DomainError);
    });
  });

  describe('calculateQuote', () => {
    it('should calculate quote with tax', () => {
      const result = calculateQuote(
        [{ quantity: 1, unitPaise: 500000 }],
        20000,
        1800
      );
      expect(result.subtotal).toBe(520000);
      expect(result.taxPaise).toBe(93600); // 520000 * 1800 / 10000
      expect(result.totalPaise).toBe(613600);
    });

    it('should calculate quote without tax', () => {
      const result = calculateQuote(
        [{ quantity: 2, unitPaise: 10000 }],
        5000,
        null
      );
      expect(result.subtotal).toBe(25000);
      expect(result.taxPaise).toBe(0);
      expect(result.totalPaise).toBe(25000);
    });

    it('should throw for invalid amounts', () => {
      expect(() => calculateQuote([], 0, 1800)).toThrow(DomainError);
      expect(() => calculateQuote([{ quantity: 0, unitPaise: 100 }], 0, 1800)).toThrow(DomainError);
      expect(() => calculateQuote([{ quantity: 1, unitPaise: -100 }], 0, 1800)).toThrow(DomainError);
    });
  });

  describe('refundAvailable', () => {
    it('should return amount when within available balance', () => {
      const result = refundAvailable(100000, [20000], 30000);
      expect(result).toBe(30000);
    });

    it('should throw when exceeding available balance', () => {
      expect(() => refundAvailable(100000, [20000], 90000)).toThrow(DomainError);
    });
  });

  describe('exactQuote', () => {
    it('should not throw for matching quote', () => {
      expect(() => exactQuote({ id: 'quote1', status: 'SENT' }, 'quote1')).not.toThrow();
    });

    it('should throw for different quote ID', () => {
      expect(() => exactQuote({ id: 'quote1', status: 'SENT' }, 'quote2')).toThrow(DomainError);
    });

    it('should throw for non-SENT status', () => {
      expect(() => exactQuote({ id: 'quote1', status: 'APPROVED' }, 'quote1')).toThrow(DomainError);
    });
  });

  describe('money', () => {
    it('should format paise as INR', () => {
      expect(money(500000)).toBe('₹5,000.00');
      expect(money(12345)).toBe('₹123.45');
      expect(money(0)).toBe('₹0.00');
    });
  });

  describe('human', () => {
    it('should format strings to human readable', () => {
      expect(human('CLEANING')).toBe('Cleaning');
      expect(human('WASH_FOLD')).toBe('Wash fold');
      expect(human('ON_THE_WAY')).toBe('On the way');
    });
  });

  describe('dateTime', () => {
    it('should format date in IST', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = dateTime(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2024');
    });
  });

  describe('localToISO', () => {
    it('should convert local datetime to ISO with IST offset', () => {
      const iso = localToISO('2024-01-15T10:30');
      expect(iso).toContain('+05:30');
      expect(iso).toContain('2024-01-15T10:30:00');
    });
  });
});

describe('Validation Schemas', () => {
  describe('bookingSchema', () => {
    const validBooking = {
      requestKey: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test',
      accessContact: 'Test - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    };

    it('should validate correct booking input', () => {
      const result = bookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });

    it('should require cleaning details for cleaning service', () => {
      const input = { ...validBooking, cleaning: undefined };
      const result = bookingSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require future appointment time', () => {
      const input = { ...validBooking, cleaningStart: new Date(Date.now() - 86400000).toISOString() };
      const result = bookingSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate laundry service requirements', () => {
      const laundryBooking = {
        ...validBooking,
        service: 'LAUNDRY' as const,
        cleaning: undefined,
        laundry: {
          type: 'WASH_FOLD' as const,
          bags: 2,
          weightGrams: 5000,
          instructions: 'Separate whites',
        },
        pickupStart: new Date(Date.now() + 86400000).toISOString(),
        cleaningStart: undefined,
      };
      const result = bookingSchema.safeParse(laundryBooking);
      expect(result.success).toBe(true);
    });

    it('should require both services for BOTH with collectDuringCleaning', () => {
      const input = {
        ...validBooking,
        service: 'BOTH' as const,
        laundry: { type: 'WASH_FOLD' as const, bags: 2, weightGrams: 5000, instructions: '' },
        pickupStart: undefined,
        collectDuringCleaning: true,
      };
      const result = bookingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('quoteSchema', () => {
    it('should validate correct quote input', () => {
      const input = {
        orderId: 'order1',
        items: [
          { description: 'Cleaning', kind: 'CLEANING', quantity: 1, unitPaise: 500000 },
        ],
        deliveryPaise: 20000,
        inclusions: 'Test',
        exclusions: 'Test',
        appointments: [{ kind: 'CLEANING', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() }],
      };
      const result = quoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('assignmentSchema', () => {
    it('should validate correct assignment input', () => {
      const input = {
        orderId: 'order1',
        kind: 'CLEANING',
        staffIds: ['staff1', 'staff2'],
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        bufferMinutes: 30,
        vendorCostPaise: 0,
        vendorAccepted: false,
      };
      const result = assignmentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject duplicate staff IDs', () => {
      const input = {
        orderId: 'order1',
        kind: 'CLEANING',
        staffIds: ['staff1', 'staff1'],
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        bufferMinutes: 30,
      };
      const result = assignmentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('proposedSchema', () => {
    it('should validate appointments array', () => {
      const input = [
        { kind: 'CLEANING', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
        { kind: 'PICKUP', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
      ];
      const result = proposedSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject duplicate appointment kinds', () => {
      const input = [
        { kind: 'CLEANING', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
        { kind: 'CLEANING', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
      ];
      const result = proposedSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});