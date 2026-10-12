import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { createOrder, prepareQuote, approveQuote, assignStaff, updateJob, readOrder } from '@/lib/orders';
import { type Actor } from '@/lib/domain';
import { Role, OrderStatus, CleaningStatus, LaundryStatus, AppointmentKind } from '@prisma/client';

describe('Booking Flow Integration Tests', () => {
  let customer: Actor;
  let admin: Actor;
  let testOrderId: string;

  beforeEach(async () => {
    // Create test customer
    const user = await db.user.create({
      data: {
        email: `test-${Date.now()}@example.test`,
        name: 'Test Customer',
        role: Role.CUSTOMER,
        active: true,
        emailVerified: new Date(),
      },
    });
    customer = { id: user.id, role: user.role };

    // Create test admin
    const adminUser = await db.user.create({
      data: {
        email: `admin-${Date.now()}@example.test`,
        name: 'Test Admin',
        role: Role.ADMIN,
        active: true,
        emailVerified: new Date(),
      },
    });
    admin = { id: adminUser.id, role: adminUser.role };

    // Create services if not exist
    await db.service.upsert({
      where: { code: 'CLEANING' },
      update: {},
      create: {
        code: 'CLEANING',
        name: 'Home Cleaning',
        inclusions: 'Test inclusions',
        exclusions: 'Test exclusions',
      },
    });

    await db.service.upsert({
      where: { code: 'LAUNDRY' },
      update: {},
      create: {
        code: 'LAUNDRY',
        name: 'Doorstep Laundry',
        inclusions: 'Test inclusions',
        exclusions: 'Test exclusions',
      },
    });
  });

  it('should create a booking request', async () => {
    const input = {
      requestKey: `test-${Date.now()}`,
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    };

    const order = await createOrder(customer, input);
    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.status).toBe(OrderStatus.REQUESTED);
    expect(order.cleaning).toBeDefined();
    expect(order.cleaning?.status).toBe(CleaningStatus.REQUESTED);
    expect(order.appointments).toHaveLength(1);
    expect(order.appointments[0].kind).toBe(AppointmentKind.CLEANING);
    testOrderId = order.id;
  });

  it('should create a booking request with both services', async () => {
    const input = {
      requestKey: `test-both-${Date.now()}`,
      service: 'BOTH',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      laundry: {
        type: 'WASH_FOLD',
        bags: 2,
        weightGrams: 5000,
        instructions: 'Separate whites',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
      pickupStart: new Date(Date.now() + 86400000).toISOString(),
    };

    const order = await createOrder(customer, input);
    expect(order).toBeDefined();
    expect(order.cleaning).toBeDefined();
    expect(order.laundry).toBeDefined();
    expect(order.appointments).toHaveLength(2);
    testOrderId = order.id;
  });

  it('should allow admin to prepare a quote', async () => {
    // First create an order
    const order = await createOrder(customer, {
      requestKey: `test-quote-${Date.now()}`,
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    });
    testOrderId = order.id;

    // Prepare quote
    const quoteInput = {
      orderId: order.id,
      items: [
        { description: 'Home cleaning - 2BHK', kind: 'CLEANING', quantity: 1, unitPaise: 500000 },
      ],
      deliveryPaise: 20000,
      inclusions: 'Kitchen, bathrooms, living areas, bedrooms, floors',
      exclusions: 'Windows, carpets, appliances interior',
      appointments: [
        { kind: 'CLEANING', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString() },
      ],
    };

    const quote = await prepareQuote(admin, quoteInput);
    expect(quote).toBeDefined();
    expect(quote.status).toBe('SENT');
    expect(quote.totalPaise).toBeGreaterThan(0);
  });

  it('should allow customer to approve quote', async () => {
    // Create order and quote
    const order = await createOrder(customer, {
      requestKey: `test-approve-${Date.now()}`,
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    });
    testOrderId = order.id;

    await prepareQuote(admin, {
      orderId: order.id,
      items: [{ description: 'Home cleaning', kind: 'CLEANING', quantity: 1, unitPaise: 500000 }],
      deliveryPaise: 20000,
      inclusions: 'Test',
      exclusions: 'Test',
      appointments: [{ kind: 'CLEANING', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString() }],
    });

    const quotes = await db.quote.findMany({ where: { orderId: order.id } });
    const quote = quotes[0];

    const result = await approveQuote(customer, order.id, quote.id);
    expect(result.id).toBe(order.id);

    const updatedOrder = await readOrder(customer, order.id);
    expect(updatedOrder.status).toBe(OrderStatus.APPROVED);
    expect(updatedOrder.quotes[0].status).toBe('APPROVED');
  });

  it('should allow admin to assign staff', async () => {
    // Create order, quote, approve
    const order = await createOrder(customer, {
      requestKey: `test-assign-${Date.now()}`,
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    });
    testOrderId = order.id;

    await prepareQuote(admin, {
      orderId: order.id,
      items: [{ description: 'Home cleaning', kind: 'CLEANING', quantity: 1, unitPaise: 500000 }],
      deliveryPaise: 20000,
      inclusions: 'Test',
      exclusions: 'Test',
      appointments: [{ kind: 'CLEANING', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString() }],
    });

    await approveQuote(customer, order.id, (await db.quote.findFirst({ where: { orderId: order.id } }))!.id);

    // Create cleaner with availability
    const cleaner = await db.user.create({
      data: {
        email: `cleaner-${Date.now()}@example.test`,
        name: 'Test Cleaner',
        role: Role.CLEANER,
        active: true,
        emailVerified: new Date(),
      },
    });

    await db.staffAvailability.create({
      data: {
        staffId: cleaner.id,
        start: new Date(Date.now() + 86400000 - 3600000),
        end: new Date(Date.now() + 86400000 + 7200000),
        kind: 'WORK',
      },
    });

    // Assign staff
    const assignInput = {
      orderId: order.id,
      kind: 'CLEANING',
      staffIds: [cleaner.id],
      start: new Date(Date.now() + 86400000).toISOString(),
      end: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      bufferMinutes: 30,
      vendorAccepted: false,
    };

    const result = await assignStaff(admin, assignInput);
    expect(result.id).toBe(order.id);

    const updatedOrder = await readOrder(admin, order.id);
    expect(updatedOrder.status).toBe(OrderStatus.CONFIRMED);
    expect(updatedOrder.appointments[0].confirmed).toBe(true);
    expect(updatedOrder.appointments[0].assignments).toHaveLength(1);
  });

  it('should update job status through lifecycle', async () => {
    // Setup order with assigned staff
    const order = await createOrder(customer, {
      requestKey: `test-status-${Date.now()}`,
      service: 'CLEANING',
      name: 'Test Customer',
      locality: 'Mananchira',
      fullAddress: '123 Test Road, Mananchira, Kozhikode',
      landmark: 'Near Test Landmark',
      accessContact: 'Test Customer - +91 99999 99999',
      floorLift: 'Ground floor',
      utilities: 'Water and electricity available',
      cleaning: {
        propertyType: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: '1200',
        furnishing: 'FURNISHED',
        cleaningType: 'Deep cleaning',
        tasks: 'Standard cleaning',
        notes: '',
      },
      cleaningStart: new Date(Date.now() + 86400000).toISOString(),
    });
    testOrderId = order.id;

    await prepareQuote(admin, {
      orderId: order.id,
      items: [{ description: 'Home cleaning', kind: 'CLEANING', quantity: 1, unitPaise: 500000 }],
      deliveryPaise: 20000,
      inclusions: 'Test',
      exclusions: 'Test',
      appointments: [{ kind: 'CLEANING', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString() }],
    });

    await approveQuote(customer, order.id, (await db.quote.findFirst({ where: { orderId: order.id } }))!.id);

    const cleaner = await db.user.create({
      data: {
        email: `cleaner-status-${Date.now()}@example.test`,
        name: 'Status Cleaner',
        role: Role.CLEANER,
        active: true,
        emailVerified: new Date(),
      },
    });

    await db.staffAvailability.create({
      data: {
        staffId: cleaner.id,
        start: new Date(Date.now() + 86400000 - 3600000),
        end: new Date(Date.now() + 86400000 + 7200000),
        kind: 'WORK',
      },
    });

    await assignStaff(admin, {
      orderId: order.id,
      kind: 'CLEANING',
      staffIds: [cleaner.id],
      start: new Date(Date.now() + 86400000).toISOString(),
      end: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      bufferMinutes: 30,
      vendorAccepted: false,
    });

    // Test status transitions
    const cleanerActor: Actor = { id: cleaner.id, role: Role.CLEANER };

    // ON_THE_WAY
    await updateJob(cleanerActor, {
      orderId: order.id,
      track: 'cleaning',
      status: 'ON_THE_WAY',
    });
    let updated = await readOrder(admin, order.id);
    expect(updated.cleaning?.status).toBe(CleaningStatus.ON_THE_WAY);

    // IN_PROGRESS
    await updateJob(cleanerActor, {
      orderId: order.id,
      track: 'cleaning',
      status: 'IN_PROGRESS',
      checklist: ['scope', 'surfaces', 'inspection'],
    });
    updated = await readOrder(admin, order.id);
    expect(updated.cleaning?.status).toBe(CleaningStatus.IN_PROGRESS);

    // COMPLETED
    await updateJob(cleanerActor, {
      orderId: order.id,
      track: 'cleaning',
      status: 'COMPLETED',
      checklist: ['scope', 'surfaces', 'inspection'],
    });
    updated = await readOrder(admin, order.id);
    expect(updated.cleaning?.status).toBe(CleaningStatus.COMPLETED);
    expect(updated.status).toBe(OrderStatus.COMPLETED);
  });
});