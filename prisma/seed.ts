import { PrismaClient, Role, OrderStatus, CleaningStatus, LaundryStatus, AppointmentKind } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create City and Service Areas for Kozhikode
  const city = await db.city.upsert({
    where: { name: 'Kozhikode' },
    update: {},
    create: {
      name: 'Kozhikode',
      timezone: 'Asia/Kolkata',
      areas: {
        create: [
          { name: 'Mananchira', active: true },
          { name: 'Kallayi', active: true },
          { name: 'Chevayur', active: true },
          { name: 'Nadakkavu', active: true },
          { name: 'West Hill', active: true },
          { name: 'Eranhipalam', active: true },
          { name: 'Mavoor Road', active: true },
          { name: 'Kozhikode Beach', active: true },
          { name: 'Beypore', active: true },
          { name: 'Feroke', active: true },
          { name: 'Kunnamangalam', active: true },
          { name: 'Peruvayal', active: true },
          { name: 'Pantheerankavu', active: true },
          { name: 'Kottooli', active: true },
          { name: 'Medical College', active: true },
        ],
      },
    },
    include: { areas: true },
  });
  console.log(`✅ City: ${city.name} with ${city.areas.length} areas`);

  // 2. Create Services
  const cleaningService = await db.service.upsert({
    where: { code: 'CLEANING' },
    update: {},
    create: {
      code: 'CLEANING',
      name: 'Home Cleaning',
      inclusions: 'Kitchen (surfaces, sink, countertop, appliance exteriors), Bathrooms (toilet, shower, basin, mirrors), Living areas (dusting, vacuuming, mopping), Bedrooms (dusting, bed making, floor care), All floors swept and mopped, Cobweb removal, Trash removal. Exact scope confirmed in your itemised quote.',
      exclusions: 'Work outside the approved scope is not included. This includes: window cleaning (exterior), carpet shampooing, upholstery deep cleaning, post-construction cleanup, mold remediation, pest control, appliance interiors (oven, fridge), laundry/ironing, organizing/decluttering, outdoor areas, high-reach areas requiring ladder.',
      prices: { create: { amountPaise: 500000, note: 'Base price for standard 2BHK apartment. Final price varies by size, condition, and requested tasks.' } },
    },
    include: { prices: true },
  });

  const laundryService = await db.service.upsert({
    where: { code: 'LAUNDRY' },
    update: {},
    create: {
      code: 'LAUNDRY',
      name: 'Doorstep Laundry',
      inclusions: 'Wash & Fold or Wash & Iron as selected, Separate collection and return visits, Garment inspection and sorting, Stain treatment (standard), Folding/hanging per preference, Bagged and labelled return. Weight recorded at intake. Exact scope confirmed in your itemised quote.',
      exclusions: 'Dry cleaning, leather/suede, heavy curtains/upholstery, shoes/bags, repairs/alterations, stain removal guarantee, express/same-day turnaround (unless quoted), items requiring special solvents. Actual weight may adjust final charge; any change requires your approval.',
      prices: { create: { amountPaise: null, note: 'Per-kg pricing configured after weight intake. Contact for current rates.' } },
    },
    include: { prices: true },
  });
  console.log(`✅ Services: ${cleaningService.name}, ${laundryService.name}`);

  // 3. Create Admin User
  const adminPassword = await hash('admin123', 12);
  const admin = await db.user.upsert({
    where: { email: 'admin@example.test' },
    update: {},
    create: {
      email: 'admin@example.test',
      name: 'Admin User',
      role: Role.ADMIN,
      active: true,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // 4. Create Staff Users
  const staffPassword = await hash('staff123', 12);
  const staffData = [
    { email: 'cleaner1@example.test', name: 'Rajesh Kumar', role: Role.CLEANER },
    { email: 'cleaner2@example.test', name: 'Priya Nair', role: Role.CLEANER },
    { email: 'cleaner3@example.test', name: 'Ameer Ali', role: Role.CLEANER },
    { email: 'cleaner4@example.test', name: 'Sunitha Das', role: Role.CLEANER },
    { email: 'cleaner5@example.test', name: 'Vinod P', role: Role.CLEANER },
    { email: 'laundry1@example.test', name: 'Fathima K', role: Role.LAUNDRY },
    { email: 'laundry2@example.test', name: 'Suresh M', role: Role.LAUNDRY },
    { email: 'delivery1@example.test', name: 'Arjun T', role: Role.DELIVERY },
    { email: 'delivery2@example.test', name: 'Meera S', role: Role.DELIVERY },
    { email: 'partner1@example.test', name: 'GreenClean Services', role: Role.PARTNER },
  ];

  const staff = [];
  for (const s of staffData) {
    const user = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        role: s.role,
        active: true,
        emailVerified: new Date(),
      },
    });
    staff.push(user);
  }
  console.log(`✅ Staff: ${staff.length} users created`);

  // 5. Create Staff Availability (next 30 days, 9am-6pm)
  const cleaners = staff.filter(s => s.role === Role.CLEANER);
  const laundryStaff = staff.filter(s => s.role === Role.LAUNDRY);
  const deliveryStaff = staff.filter(s => s.role === Role.DELIVERY);

  for (const cleaner of cleaners) {
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(9, 0, 0, 0);
      const end = new Date(date.getTime() + 9 * 3600000); // 9 hours

      await db.staffAvailability.create({
        data: {
          staffId: cleaner.id,
          start: date,
          end,
          kind: 'WORK',
        },
      });
    }
  }

  for (const ls of laundryStaff) {
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(9, 0, 0, 0);
      const end = new Date(date.getTime() + 9 * 3600000);

      await db.staffAvailability.create({
        data: {
          staffId: ls.id,
          start: date,
          end,
          kind: 'WORK',
        },
      });
    }
  }

  for (const ds of deliveryStaff) {
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(9, 0, 0, 0);
      const end = new Date(date.getTime() + 9 * 3600000);

      await db.staffAvailability.create({
        data: {
          staffId: ds.id,
          start: date,
          end,
          kind: 'WORK',
        },
      });
    }
  }
  console.log(`✅ Staff availability: 30 days for ${cleaners.length + laundryStaff.length + deliveryStaff.length} staff`);

  // 6. Create Demo Customers
  const customerPassword = await hash('customer123', 12);
  const customers = [];
  const customerData = [
    { email: 'customer1@example.test', name: 'Anjali Menon', phone: '+919876543210', locality: 'Mananchira', address: '12/45, Court Road, Mananchira, Kozhikode - 673001', landmark: 'Near Mananchira Square', accessContact: 'Anjali Menon - +91 98765 43210', floorLift: 'Ground floor, no lift', utilities: 'Water and electricity available' },
    { email: 'customer2@example.test', name: 'Rahul Nambiar', phone: '+919876543211', locality: 'Chevayur', address: '3/67, Chevayur Road, Chevayur, Kozhikode - 673017', landmark: 'Opposite Chevayur Temple', accessContact: 'Rahul Nambiar - +91 98765 43211', floorLift: '2nd floor, lift available', utilities: 'Water and electricity available' },
    { email: 'customer3@example.test', name: 'Sneha Warrier', phone: '+919876543212', locality: 'Nadakkavu', address: '8/12, Nadakkavu Cross Road, Nadakkavu, Kozhikode - 673011', landmark: 'Near Nadakkavu Bus Stop', accessContact: 'Sneha Warrier - +91 98765 43212', floorLift: '1st floor, stairs only', utilities: 'Water and electricity available' },
    { email: 'customer4@example.test', name: 'Mohammed Ali', phone: '+919876543213', locality: 'Kallayi', address: '5/89, Kallayi Road, Kallayi, Kozhikode - 673003', landmark: 'Near Kallayi Bridge', accessContact: 'Mohammed Ali - +91 98765 43213', floorLift: 'Ground floor', utilities: 'Water and electricity available' },
    { email: 'customer5@example.test', name: 'Lakshmi Nair', phone: '+919876543214', locality: 'West Hill', address: '2/34, West Hill Road, West Hill, Kozhikode - 673005', landmark: 'Near West Hill Railway Station', accessContact: 'Lakshmi Nair - +91 98765 43214', floorLift: '3rd floor, lift available', utilities: 'Water and electricity available' },
  ];

  for (const c of customerData) {
    const user = await db.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        name: c.name,
        phone: c.phone,
        role: Role.CUSTOMER,
        active: true,
        emailVerified: new Date(),
      },
    });

    await db.customerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    await db.address.create({
      data: {
        profileId: (await db.customerProfile.findUnique({ where: { userId: user.id } }))!.id,
        locality: c.locality,
        fullAddress: c.address,
        landmark: c.landmark,
        accessContact: c.accessContact,
        floorLift: c.floorLift,
        utilities: c.utilities,
      },
    });

    customers.push(user);
  }
  console.log(`✅ Customers: ${customers.length} created with profiles and addresses`);

  // 7. Create Sample Orders across different statuses
  const statuses: OrderStatus[] = ['REQUESTED', 'QUOTED', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const cleaningStatuses: CleaningStatus[] = ['REQUESTED', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const laundryStatuses: LaundryStatus[] = ['REQUESTED', 'PICKUP_SCHEDULED', 'COLLECTED', 'AWAITING_PRICE_APPROVAL', 'PROCESSING', 'QUALITY_CHECKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  const areas = city.areas.map(a => a.name);
  const services = [cleaningService, laundryService];

  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length];
    const profile = await db.customerProfile.findUnique({ where: { userId: customer.id } });
    const address = await db.address.findFirst({ where: { profileId: profile!.id } });
    const status = statuses[i % statuses.length];
    const serviceType = i % 3; // 0: cleaning, 1: laundry, 2: both

    const cleaning = serviceType !== 1;
    const laundry = serviceType !== 0;

    const order = await db.order.create({
      data: {
        userId: customer.id,
        addressId: address!.id,
        customerName: customer.name!,
        status,
        requestKey: `REQ-${Date.now()}-${i}`,
        items: {
          create: services
            .filter(s => (s.code === 'CLEANING' && cleaning) || (s.code === 'LAUNDRY' && laundry))
            .map(s => ({
              serviceId: s.id,
              details: s.code === 'CLEANING'
                ? { propertyType: 'Apartment', bedrooms: 2, bathrooms: 2, area: '1200', furnishing: 'FURNISHED', cleaningType: 'Deep cleaning', tasks: 'Standard deep cleaning', notes: '' }
                : { type: 'WASH_FOLD', bags: 2, weightGrams: 5000, instructions: 'Separate whites and colors', returnPreference: 'Evening return preferred', collectDuringCleaning: false },
            })),
        },
        cleaning: cleaning ? { create: { status: cleaningStatuses[i % cleaningStatuses.length], checklist: '[]' } } : undefined,
        laundry: laundry ? {
          create: {
            status: laundryStatuses[i % laundryStatuses.length],
            estimatedWeightGrams: 5000,
            bags: { create: Array.from({ length: 2 }, (_, j) => ({ label: `BAG-${Date.now()}-${i}-${j}` })) },
          },
        } : undefined,
        appointments: {
          create: [
            ...(cleaning ? [{
              kind: AppointmentKind.CLEANING,
              requestedStart: new Date(Date.now() + (i + 1) * 86400000),
              requestedEnd: new Date(Date.now() + (i + 1) * 86400000 + 3600000),
              confirmed: status !== 'REQUESTED' && status !== 'QUOTED',
              start: status !== 'REQUESTED' && status !== 'QUOTED' ? new Date(Date.now() + (i + 1) * 86400000) : null,
              end: status !== 'REQUESTED' && status !== 'QUOTED' ? new Date(Date.now() + (i + 1) * 86400000 + 3600000) : null,
            }] : []),
            ...(laundry ? [{
              kind: AppointmentKind.PICKUP,
              requestedStart: new Date(Date.now() + (i + 1) * 86400000),
              requestedEnd: new Date(Date.now() + (i + 1) * 86400000 + 3600000),
              confirmed: status !== 'REQUESTED' && status !== 'QUOTED',
              start: status !== 'REQUESTED' && status !== 'QUOTED' ? new Date(Date.now() + (i + 1) * 86400000) : null,
              end: status !== 'REQUESTED' && status !== 'QUOTED' ? new Date(Date.now() + (i + 1) * 86400000 + 3600000) : null,
            }] : []),
            ...(laundry && status === 'COMPLETED' ? [{
              kind: AppointmentKind.RETURN,
              requestedStart: new Date(Date.now() + (i + 2) * 86400000),
              requestedEnd: new Date(Date.now() + (i + 2) * 86400000 + 3600000),
              confirmed: true,
              start: new Date(Date.now() + (i + 2) * 86400000),
              end: new Date(Date.now() + (i + 2) * 86400000 + 3600000),
            }] : []),
          ],
        },
      },
    });

    // Add quotes for QUOTED, APPROVED, CONFIRMED, COMPLETED orders
    if (['QUOTED', 'APPROVED', 'CONFIRMED', 'COMPLETED'].includes(status)) {
      const quoteItems = [];
      if (cleaning) {
        quoteItems.push({
          description: 'Home cleaning - 2BHK apartment',
          kind: 'CLEANING',
          quantity: 1,
          unitPaise: 500000,
          totalPaise: 500000,
        });
      }
      if (laundry) {
        quoteItems.push({
          description: 'Wash & Fold - 2 bags',
          kind: 'LAUNDRY',
          quantity: 5,
          unitPaise: 10000,
          totalPaise: 50000,
        });
      }

      const subtotal = quoteItems.reduce((sum, item) => sum + item.totalPaise, 0);
      const deliveryPaise = 20000;
      const taxPaise = Math.round((subtotal + deliveryPaise) * 0.18);
      const totalPaise = subtotal + deliveryPaise + taxPaise;

      await db.quote.create({
        data: {
          orderId: order.id,
          version: 1,
          status: status === 'QUOTED' ? 'SENT' : 'APPROVED',
          totalPaise,
          taxBps: 1800,
          taxPaise,
          deliveryPaise,
          inclusions: cleaningService.inclusions + (laundry ? '\n\n' + laundryService.inclusions : ''),
          exclusions: cleaningService.exclusions + (laundry ? '\n\n' + laundryService.exclusions : ''),
          appointments: JSON.stringify(
            order.appointments.map(a => ({
              kind: a.kind,
              start: a.start?.toISOString() || a.requestedStart.toISOString(),
              end: a.end?.toISOString() || a.requestedEnd.toISOString(),
            }))
          ),
          laundryWeightGrams: laundry ? 5000 : null,
          items: { create: quoteItems },
          approvedAt: ['APPROVED', 'CONFIRMED', 'COMPLETED'].includes(status) ? new Date() : null,
        },
      });
    }

    // Add assignments for CONFIRMED, COMPLETED orders
    if (['CONFIRMED', 'COMPLETED'].includes(status)) {
      const cleaningAppointment = order.appointments.find(a => a.kind === 'CLEANING');
      const pickupAppointment = order.appointments.find(a => a.kind === 'PICKUP');

      if (cleaningAppointment) {
        const assignedCleaners = cleaners.slice(0, 2);
        for (const cleaner of assignedCleaners) {
          await db.assignment.create({
            data: {
              appointmentId: cleaningAppointment.id,
              staffId: cleaner.id,
              start: cleaningAppointment.start!,
              end: cleaningAppointment.end!,
              busyUntil: new Date(cleaningAppointment.end!.getTime() + 30 * 60000),
              active: true,
            },
          });
        }
        await db.appointment.update({
          where: { id: cleaningAppointment.id },
          data: { confirmed: true },
        });
      }

      if (pickupAppointment) {
        const assignedLaundry = laundryStaff[0];
        const assignedDelivery = deliveryStaff[0];
        for (const staffMember of [assignedLaundry, assignedDelivery]) {
          await db.assignment.create({
            data: {
              appointmentId: pickupAppointment.id,
              staffId: staffMember.id,
              start: pickupAppointment.start!,
              end: pickupAppointment.end!,
              busyUntil: new Date(pickupAppointment.end!.getTime() + 30 * 60000),
              active: true,
            },
          });
        }
        await db.appointment.update({
          where: { id: pickupAppointment.id },
          data: { confirmed: true },
        });
      }
    }

    // Add payments for COMPLETED orders
    if (status === 'COMPLETED') {
      const quote = await db.quote.findFirst({ where: { orderId: order.id }, orderBy: { version: 'desc' } });
      if (quote) {
        await db.payment.create({
          data: {
            orderId: order.id,
            provider: 'MANUAL_EXTERNAL_RECORD',
            reference: `PAY-${order.id}`,
            amountPaise: quote.totalPaise,
            status: 'SUCCEEDED',
          },
        });
      }
    }
  }
  console.log(`✅ Sample orders: 20 created across all statuses`);

  // 8. Create Settings
  await db.setting.upsert({
    where: { key: 'taxBps' },
    update: {},
    create: { key: 'taxBps', value: '1800' },
  });
  console.log(`✅ Settings: taxBps configured`);

  // 9. Create Third Party Provider
  const partnerUser = staff.find(s => s.role === Role.PARTNER);
  if (partnerUser) {
    await db.thirdPartyProvider.upsert({
      where: { id: partnerUser.providerId || 'new' },
      update: {},
      create: {
        name: 'GreenClean Services',
        approved: true,
        users: { connect: { id: partnerUser.id } },
      },
    });
    console.log(`✅ Partner provider: GreenClean Services (approved)`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });