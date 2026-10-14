// Fictional sample data for the public demo. Nothing here touches a database,
// an external service or a real person. Shapes mirror the Prisma models the
// pages already consume, so the existing views render unchanged.

import { DEMO_ADMIN_ID, DEMO_CUSTOMER_ID, DEMO_STAFF_ID } from './actor';

export type DemoRole = 'CUSTOMER' | 'ADMIN' | 'CLEANER' | 'LAUNDRY' | 'DELIVERY' | 'PARTNER';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: DemoRole;
  active: boolean;
  emailVerified: Date | null;
  providerId: string | null;
  image: string | null;
};

type DemoAddress = {
  id: string;
  locality: string;
  fullAddress: string;
  landmark: string | null;
  accessContact: string;
  floorLift: string;
  utilities: string;
};

type DemoQuoteItem = { id: string; description: string; kind: string; quantity: number; unitPaise: number; totalPaise: number };
type DemoQuote = {
  id: string;
  version: number;
  status: string;
  totalPaise: number;
  taxBps: number | null;
  taxPaise: number;
  discountPaise: number;
  deliveryPaise: number;
  inclusions: string;
  exclusions: string;
  appointments: { kind: string; start: string; end: string }[];
  laundryWeightGrams: number | null;
  createdAt: Date;
  approvedAt: Date | null;
  approvedById: string | null;
  items: DemoQuoteItem[];
};
type DemoStaffRef = { id: string; name: string; role: string };
type DemoAssignment = {
  id: string;
  active: boolean;
  start: Date;
  end: Date;
  busyUntil: Date;
  staffId: string;
  staff: DemoStaffRef;
  providerId: string | null;
  provider: { id: string; name: string } | null;
  vendorAcceptedAt: Date | null;
  vendorCostPaise: number | null;
  promisedCompletion: Date | null;
  settledPaise: number;
};
type DemoAppointment = {
  id: string;
  orderId: string;
  kind: 'CLEANING' | 'PICKUP' | 'RETURN';
  requestedStart: Date;
  requestedEnd: Date;
  start: Date | null;
  end: Date | null;
  confirmed: boolean;
  assignments: DemoAssignment[];
};
type DemoCleaning = { id: string; status: string; checklist: string };
type DemoLaundryBag = { id: string; label: string; handovers: unknown[] };
type DemoLaundry = { id: string; status: string; estimatedWeightGrams: number | null; actualWeightGrams: number | null; bags: DemoLaundryBag[] };
type DemoPayment = { id: string; orderId: string; provider: string; reference: string; amountPaise: number; status: string; createdAt: Date; refunds: { id: string; amountPaise: number; status: string; reason: string }[] };
type DemoSupport = { id: string; orderId: string; kind: string; message: string; response: string | null; status: string; createdAt: Date };
type DemoEvent = { id: string; track: string; status: string; note: string | null; createdAt: Date };

export type DemoOrder = {
  id: string;
  userId: string;
  addressId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  address: DemoAddress;
  items: { id: string; serviceId: string; details: Record<string, unknown>; service: { id: string; code: string; name: string } }[];
  cleaning: DemoCleaning | null;
  laundry: DemoLaundry | null;
  quotes: DemoQuote[];
  appointments: DemoAppointment[];
  payments: DemoPayment[];
  supports: DemoSupport[];
  events: DemoEvent[];
  uploads: { id: string; orderId: string }[];
};

const NOW = Date.now();
const DAY = 86_400_000;

function at(dayOffset: number, istHour = 9): Date {
  const d = new Date(NOW + dayOffset * DAY);
  d.setUTCHours(((istHour - 5) % 24 + 24) % 24, 30, 0, 0);
  return d;
}

const CLEANING_INCLUSIONS =
  'Kitchen (surfaces, sink, countertop, appliance exteriors), bathrooms (toilet, shower, basin, mirrors), living areas (dusting, vacuuming, mopping), bedrooms (dusting, bed making, floor care), all floors swept and mopped, cobweb removal and trash removal. Exact scope confirmed in your itemised quote.';
const CLEANING_EXCLUSIONS =
  'Work outside the approved scope is not included: exterior windows, carpet shampooing, upholstery deep cleaning, post-construction cleanup, mold remediation, pest control, appliance interiors, laundry/ironing, decluttering, outdoor areas and high-reach work.';
const LAUNDRY_INCLUSIONS =
  'Wash & Fold or Wash & Iron as selected, separate collection and return visits, garment inspection and sorting, standard stain treatment, folding or hanging per preference, and bagged, labelled return. Weight is recorded at intake. Exact scope confirmed in your itemised quote.';
const LAUNDRY_EXCLUSIONS =
  'Dry cleaning, leather and suede, heavy curtains and upholstery, shoes and bags, repairs and alterations, a stain-removal guarantee and special solvents are not included. Actual weight may adjust the final charge; any change needs your approval before processing.';

export const demoServices = [
  { id: 'demo-service-cleaning', code: 'CLEANING', name: 'Home Cleaning', inclusions: CLEANING_INCLUSIONS, exclusions: CLEANING_EXCLUSIONS, prices: [{ id: 'demo-price-cleaning', amountPaise: 500_000, note: 'Base price for a standard 2BHK apartment.', effectiveAt: at(-90) }] },
  { id: 'demo-service-laundry', code: 'LAUNDRY', name: 'Doorstep Laundry', inclusions: LAUNDRY_INCLUSIONS, exclusions: LAUNDRY_EXCLUSIONS, prices: [{ id: 'demo-price-laundry', amountPaise: 4_000, note: 'Per kilogram, recorded at intake.', effectiveAt: at(-90) }] },
];

export const demoSettings = [
  { key: 'taxBps', value: '1800' },
  { key: 'cancellationPolicy', value: 'Cancel free of charge up to 24 hours before a confirmed appointment. Later cancellations may be reviewed case by case; any applicable amount is always shown on your itemised quote before it is charged.' },
  { key: 'reschedulingPolicy', value: 'Request a new time from your booking and our team will confirm availability. Rescheduling is free once per booking; further changes are reviewed by operations.' },
  { key: 'contactDetails', value: 'Klean Ur Mind, Mananchira, Kozhikode 673001, Kerala.\nPhone: +91 98470 00000 (9am–7pm IST)\nEmail: care@kleanurmind.example' },
];

const AREA_NAMES = ['Mananchira', 'Kallayi', 'Chevayur', 'Nadakkavu', 'West Hill', 'Eranhipalam', 'Mavoor Road', 'Kozhikode Beach', 'Beypore', 'Feroke', 'Kunnamangalam', 'Peruvayal', 'Pantheerankavu', 'Kottooli', 'Medical College'];

export const demoAreas = AREA_NAMES.map((name, i) => ({ id: `demo-area-${i + 1}`, name, active: i < 13, city: { id: 'demo-city', name: 'Kozhikode' } }));

export const demoUsers: DemoUser[] = [
  { id: DEMO_CUSTOMER_ID, name: 'Ananya Menon', email: 'ananya.menon@example.test', phone: '+91 98470 12345', role: 'CUSTOMER', active: true, emailVerified: at(-200), providerId: null, image: null },
  { id: 'demo-customer-2', name: 'Rahul Nambiar', email: 'rahul.nambiar@example.test', phone: '+91 98470 22334', role: 'CUSTOMER', active: true, emailVerified: at(-180), providerId: null, image: null },
  { id: 'demo-customer-3', name: 'Sneha Warrier', email: 'sneha.warrier@example.test', phone: '+91 98470 33445', role: 'CUSTOMER', active: true, emailVerified: at(-160), providerId: null, image: null },
  { id: 'demo-customer-4', name: 'Mohammed Ali', email: 'mohammed.ali@example.test', phone: '+91 98470 44556', role: 'CUSTOMER', active: true, emailVerified: at(-140), providerId: null, image: null },
  { id: 'demo-customer-5', name: 'Lakshmi Nair', email: 'lakshmi.nair@example.test', phone: '+91 98470 55667', role: 'CUSTOMER', active: true, emailVerified: at(-120), providerId: null, image: null },
  { id: DEMO_ADMIN_ID, name: 'Operations Admin', email: 'admin@example.test', phone: null, role: 'ADMIN', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: DEMO_STAFF_ID, name: 'Rajesh Kumar', email: 'rajesh.kumar@example.test', phone: '+91 98470 55221', role: 'CLEANER', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: 'demo-staff-cleaner-2', name: 'Priya Nair', email: 'priya.nair@example.test', phone: '+91 98470 66332', role: 'CLEANER', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: 'demo-staff-cleaner-3', name: 'Ameer Ali', email: 'ameer.ali@example.test', phone: '+91 98470 77332', role: 'CLEANER', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: 'demo-staff-laundry-1', name: 'Fathima K', email: 'fathima.k@example.test', phone: '+91 98470 88991', role: 'LAUNDRY', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: 'demo-staff-delivery-1', name: 'Arjun T', email: 'arjun.t@example.test', phone: '+91 98470 99002', role: 'DELIVERY', active: true, emailVerified: at(-300), providerId: null, image: null },
  { id: 'demo-staff-partner-1', name: 'GreenClean Services', email: 'partner@example.test', phone: '+91 98470 10101', role: 'PARTNER', active: true, emailVerified: at(-300), providerId: 'demo-provider-1', image: null },
];

const addressFor: Record<string, DemoAddress> = {
  [DEMO_CUSTOMER_ID]: { id: 'demo-address-1', locality: 'Mananchira', fullAddress: '12/45, Court Road, Mananchira, Kozhikode 673001', landmark: 'Near Mananchira Square', accessContact: 'Ananya Menon · +91 98470 12345', floorLift: 'Ground floor, no lift', utilities: 'Water and electricity available' },
  'demo-customer-2': { id: 'demo-address-2', locality: 'Chevayur', fullAddress: '3/67, Chevayur Road, Chevayur, Kozhikode 673017', landmark: 'Opposite Chevayur Temple', accessContact: 'Rahul Nambiar · +91 98470 22334', floorLift: '2nd floor, lift available', utilities: 'Water and electricity available' },
  'demo-customer-3': { id: 'demo-address-3', locality: 'Nadakkavu', fullAddress: '8/12, Nadakkavu Cross Road, Nadakkavu, Kozhikode 673011', landmark: 'Near Nadakkavu Bus Stop', accessContact: 'Sneha Warrier · +91 98470 33445', floorLift: '1st floor, stairs only', utilities: 'Water and electricity available' },
  'demo-customer-4': { id: 'demo-address-4', locality: 'Kallayi', fullAddress: '5/89, Kallayi Road, Kallayi, Kozhikode 673003', landmark: 'Near Kallayi Bridge', accessContact: 'Mohammed Ali · +91 98470 44556', floorLift: 'Ground floor', utilities: 'Water and electricity available' },
  'demo-customer-5': { id: 'demo-address-5', locality: 'West Hill', fullAddress: '2/34, West Hill Road, West Hill, Kozhikode 673005', landmark: 'Near West Hill Railway Station', accessContact: 'Lakshmi Nair · +91 98470 55667', floorLift: '3rd floor, lift available', utilities: 'Water and electricity available' },
};

const staffRef = (id: string): DemoStaffRef => {
  const user = demoUsers.find((u) => u.id === id);
  return { id, name: user?.name ?? 'Team member', role: user?.role ?? 'CLEANER' };
};

const OWNER_IDS = [DEMO_CUSTOMER_ID, 'demo-customer-2', 'demo-customer-3', 'demo-customer-4', 'demo-customer-5'];
const ORDER_STATUSES = ['REQUESTED', 'QUOTED', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function buildOrders(): DemoOrder[] {
  const orders: DemoOrder[] = [];
  for (let i = 0; i < 18; i++) {
    const ownerId = i % 3 === 0 ? DEMO_CUSTOMER_ID : OWNER_IDS[(i % (OWNER_IDS.length - 1)) + 1];
    const owner = demoUsers.find((u) => u.id === ownerId)!;
    const address = addressFor[ownerId];
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const serviceType = i % 3;
    const cleaning = serviceType !== 1;
    const laundry = serviceType !== 0;
    const closed = status === 'CANCELLED';
    const quoted = ['QUOTED', 'APPROVED', 'CONFIRMED', 'COMPLETED'].includes(status);
    const confirmed = ['APPROVED', 'CONFIRMED', 'COMPLETED'].includes(status);
    const orderId = `demo-order-${i + 1}`;

    const cleaningStatus = status === 'COMPLETED' ? 'COMPLETED' : closed ? 'CANCELLED' : confirmed ? (status === 'CONFIRMED' ? 'IN_PROGRESS' : 'CONFIRMED') : 'REQUESTED';
    const laundryStatus = status === 'COMPLETED' ? 'DELIVERED' : closed ? 'CANCELLED' : confirmed ? 'PROCESSING' : 'REQUESTED';

    const cleaningApptStart = at(i - 8, 10);
    const pickupStart = at(i - 8, 15);
    const returnStart = at(i - 6, 15);

    const appointments: DemoAppointment[] = [];
    if (cleaning) {
      const assignments: DemoAssignment[] = [];
      if (status === 'CONFIRMED' || status === 'COMPLETED') {
        assignments.push({
          id: `${orderId}-assign-c1`, active: true, start: cleaningApptStart, end: new Date(cleaningApptStart.getTime() + 3 * 3600000), busyUntil: new Date(cleaningApptStart.getTime() + 3.5 * 3600000),
          staffId: DEMO_STAFF_ID, staff: staffRef(DEMO_STAFF_ID), providerId: null, provider: null, vendorAcceptedAt: null, vendorCostPaise: null, promisedCompletion: null, settledPaise: 0,
        });
        assignments.push({
          id: `${orderId}-assign-c2`, active: true, start: cleaningApptStart, end: new Date(cleaningApptStart.getTime() + 3 * 3600000), busyUntil: new Date(cleaningApptStart.getTime() + 3.5 * 3600000),
          staffId: 'demo-staff-cleaner-2', staff: staffRef('demo-staff-cleaner-2'), providerId: null, provider: null, vendorAcceptedAt: null, vendorCostPaise: null, promisedCompletion: null, settledPaise: 0,
        });
      }
      appointments.push({ id: `${orderId}-appt-cleaning`, orderId, kind: 'CLEANING', requestedStart: cleaningApptStart, requestedEnd: new Date(cleaningApptStart.getTime() + 3 * 3600000), start: confirmed ? cleaningApptStart : null, end: confirmed ? new Date(cleaningApptStart.getTime() + 3 * 3600000) : null, confirmed, assignments });
    }
    if (laundry) {
      const assignments: DemoAssignment[] = [];
      if (status === 'CONFIRMED' || status === 'COMPLETED') {
        assignments.push({
          id: `${orderId}-assign-l1`, active: true, start: pickupStart, end: new Date(pickupStart.getTime() + 3600000), busyUntil: new Date(pickupStart.getTime() + 1.5 * 3600000),
          staffId: 'demo-staff-laundry-1', staff: staffRef('demo-staff-laundry-1'), providerId: null, provider: null, vendorAcceptedAt: null, vendorCostPaise: null, promisedCompletion: null, settledPaise: 0,
        });
        assignments.push({
          id: `${orderId}-assign-d1`, active: true, start: pickupStart, end: new Date(pickupStart.getTime() + 3600000), busyUntil: new Date(pickupStart.getTime() + 1.5 * 3600000),
          staffId: 'demo-staff-delivery-1', staff: staffRef('demo-staff-delivery-1'), providerId: null, provider: null, vendorAcceptedAt: null, vendorCostPaise: null, promisedCompletion: null, settledPaise: 0,
        });
      }
      appointments.push({ id: `${orderId}-appt-pickup`, orderId, kind: 'PICKUP', requestedStart: pickupStart, requestedEnd: new Date(pickupStart.getTime() + 3600000), start: confirmed ? pickupStart : null, end: confirmed ? new Date(pickupStart.getTime() + 3600000) : null, confirmed, assignments });
      if (status === 'COMPLETED') appointments.push({ id: `${orderId}-appt-return`, orderId, kind: 'RETURN', requestedStart: returnStart, requestedEnd: new Date(returnStart.getTime() + 3600000), start: returnStart, end: new Date(returnStart.getTime() + 3600000), confirmed: true, assignments: [] });
    }

    const items: DemoOrder['items'] = [];
    if (cleaning) items.push({ id: `${orderId}-item-c`, serviceId: 'demo-service-cleaning', service: { id: 'demo-service-cleaning', code: 'CLEANING', name: 'Home Cleaning' }, details: { propertyType: 'Apartment', bedrooms: 2, bathrooms: 2, area: '1100', furnishing: 'FURNISHED', cleaningType: 'Deep cleaning', tasks: 'Kitchen and bathrooms deep clean', notes: 'Please avoid the study shelf.' } });
    if (laundry) items.push({ id: `${orderId}-item-l`, serviceId: 'demo-service-laundry', service: { id: 'demo-service-laundry', code: 'LAUNDRY', name: 'Doorstep Laundry' }, details: { type: 'WASH_FOLD', bags: 2, weightGrams: 5200, instructions: 'Separate whites and colours', returnPreference: 'Evening return preferred', collectDuringCleaning: false } });

    const quotes: DemoQuote[] = [];
    if (quoted) {
      const quoteItems: DemoQuoteItem[] = [];
      if (cleaning) quoteItems.push({ id: `${orderId}-qi-c`, description: 'Home cleaning · 2BHK apartment', kind: 'CLEANING', quantity: 1, unitPaise: 500_000, totalPaise: 500_000 });
      if (laundry) quoteItems.push({ id: `${orderId}-qi-l`, description: 'Wash & Fold · 5.2 kg', kind: 'LAUNDRY', quantity: 52, unitPaise: 600, totalPaise: 31_200 });
      const subtotal = quoteItems.reduce((sum, item) => sum + item.totalPaise, 0);
      const deliveryPaise = 20_000;
      const taxPaise = Math.round((subtotal + deliveryPaise) * 0.18);
      const totalPaise = subtotal + deliveryPaise + taxPaise;
      const quoteStatus = status === 'QUOTED' ? 'SENT' : 'APPROVED';
      quotes.push({
        id: `${orderId}-quote-1`, version: 1, status: quoteStatus, totalPaise, taxBps: 1800, taxPaise, discountPaise: 0, deliveryPaise,
        inclusions: [cleaning ? CLEANING_INCLUSIONS : '', laundry ? LAUNDRY_INCLUSIONS : ''].filter(Boolean).join('\n\n'),
        exclusions: [cleaning ? CLEANING_EXCLUSIONS : '', laundry ? LAUNDRY_EXCLUSIONS : ''].filter(Boolean).join('\n\n'),
        appointments: appointments.map((a) => ({ kind: a.kind, start: (a.start ?? a.requestedStart).toISOString(), end: (a.end ?? a.requestedEnd).toISOString() })),
        laundryWeightGrams: laundry ? 5200 : null,
        createdAt: at(i - 9, 12),
        approvedAt: status === 'QUOTED' ? null : at(i - 8, 12),
        approvedById: status === 'QUOTED' ? null : DEMO_CUSTOMER_ID,
        items: quoteItems,
      });
    }

    const payments: DemoPayment[] = status === 'COMPLETED' && quotes[0]
      ? [{ id: `${orderId}-payment-1`, orderId, provider: 'MANUAL_EXTERNAL_RECORD', reference: `PAY-${orderId}`, amountPaise: quotes[0].totalPaise, status: 'SUCCEEDED', createdAt: at(i - 5, 13), refunds: [] }]
      : [];

    const supports: DemoSupport[] = i === 4
      ? [{ id: `${orderId}-support-1`, orderId, kind: 'RESCHEDULE', message: 'Could we move the pickup to the following morning, please?', response: null, status: 'OPEN', createdAt: at(-2, 9) }]
      : i === 7
        ? [{ id: `${orderId}-support-2`, orderId, kind: 'SUPPORT', message: 'Please include the balcony in the cleaning scope.', response: 'Added to the approved scope at no extra charge.', status: 'RESOLVED', createdAt: at(-6, 16) }]
        : [];

    const events: DemoEvent[] = [
      { id: `${orderId}-event-1`, track: 'ORDER', status: 'REQUESTED', note: 'Preferred times are requests; capacity is not yet confirmed.', createdAt: at(i - 10, 9) },
      ...(cleaning ? [{ id: `${orderId}-event-2`, track: 'CLEANING', status: cleaningStatus, note: null, createdAt: at(i - 8, 10) }] : []),
      ...(laundry ? [{ id: `${orderId}-event-3`, track: 'LAUNDRY', status: laundryStatus, note: null, createdAt: at(i - 8, 15) }] : []),
    ];

    orders.push({
      id: orderId, userId: ownerId, addressId: address.id, customerName: owner.name, customerPhone: owner.phone, customerEmail: owner.email,
      status, createdAt: at(i - 10, 9), updatedAt: at(i - 4, 12), address, items,
      cleaning: cleaning ? { id: `${orderId}-cleaning`, status: cleaningStatus, checklist: status === 'COMPLETED' ? '["scope","surfaces","inspection"]' : '[]' } : null,
      laundry: laundry ? { id: `${orderId}-laundry`, status: laundryStatus, estimatedWeightGrams: 5200, actualWeightGrams: confirmed ? 5400 : null, bags: [1, 2].map((n) => ({ id: `${orderId}-bag-${n}`, label: `BAG-${orderId}-${n}`, handovers: [] })) } : null,
      quotes, appointments, payments, supports, events, uploads: [],
    });
  }
  return orders;
}

export const demoOrders = buildOrders();

export const demoProviders = [
  {
    id: 'demo-provider-1', name: 'GreenClean Services', approved: true,
    assignments: [{
      id: 'demo-provider-assign-1', start: at(1, 10), appointment: { id: 'demo-order-2-appt-cleaning', kind: 'CLEANING' },
      vendorAcceptedAt: at(-1, 10), promisedCompletion: at(1, 14), vendorCostPaise: 320_000, settledPaise: 0,
    }],
  },
];

export const demoAvailability = demoUsers
  .filter((u) => u.role === 'CLEANER' || u.role === 'LAUNDRY' || u.role === 'DELIVERY')
  .flatMap((u) => [0, 1, 2, 3, 4].map((d) => ({ id: `demo-avail-${u.id}-${d}`, staffId: u.id, kind: 'WORK', start: at(d, 9), end: at(d, 18) })));

// --- lookups used by the data facade ---------------------------------------

export function getServiceContent(code: string) {
  const service = demoServices.find((s) => s.code === code);
  return service ? { inclusions: service.inclusions, exclusions: service.exclusions } : null;
}
export function getServices() {
  return demoServices.map(({ id, code, name, inclusions, exclusions }) => ({ id, code, name, inclusions, exclusions }));
}
export function getServicesWithPrices() {
  return demoServices.map(({ id, name, prices }) => ({ id, name, prices }));
}
export function getSettings(keys: string[]) {
  return demoSettings.filter((s) => keys.includes(s.key));
}
export function getSettingValue(key: string) {
  const row = demoSettings.find((s) => s.key === key);
  return row ? { key: row.key, value: row.value } : null;
}
export function getAreasWithCity() {
  return demoAreas;
}
export function findServiceArea(name: string) {
  const target = name.trim().toLowerCase();
  const area = demoAreas.find((a) => a.name.toLowerCase() === target);
  return area ? { id: area.id, active: area.active } : null;
}
export function getOrderById(id: string) {
  return demoOrders.find((o) => o.id === id) ?? null;
}
export function getOrdersByUser(userId: string) {
  return demoOrders.filter((o) => o.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
export function getBookingsByUser(userId: string, tab: string) {
  const all = getOrdersByUser(userId);
  const filtered = all.filter((o) => (tab === 'past' ? o.status === 'COMPLETED' : tab === 'cancelled' ? o.status === 'CANCELLED' : !['COMPLETED', 'CANCELLED'].includes(o.status)));
  return { orders: filtered, count: filtered.length };
}
export function getProfile(userId: string) {
  const user = demoUsers.find((u) => u.id === userId) ?? demoUsers.find((u) => u.id === DEMO_CUSTOMER_ID)!;
  const address = addressFor[user.id] ?? addressFor[DEMO_CUSTOMER_ID];
  return { user: { name: user.name, email: user.email, phone: user.phone, role: user.role }, address };
}
export function getStaffJobs(userId: string) {
  return demoOrders
    .filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status) && o.appointments.some((a) => a.assignments.some((s) => s.staffId === userId && s.active)))
    .map((o) => ({ ...o, user: { phone: o.customerPhone } }));
}
export function getNonAdminUsers() {
  return demoUsers.filter((u) => u.role !== 'ADMIN').map(({ id, name, email, role, active }) => ({ id, name, email, role, active }));
}
export function getBasicStaff() {
  return demoUsers.filter((u) => !['CUSTOMER', 'ADMIN'].includes(u.role)).map(({ id, name, role }) => ({ id, name, role }));
}
export function getStaffWithAvailability() {
  return demoUsers.filter((u) => !['CUSTOMER', 'ADMIN'].includes(u.role)).map((u) => ({
    id: u.id, name: u.name, role: u.role,
    availability: demoAvailability.filter((a) => a.staffId === u.id).slice(0, 10),
    assignments: demoOrders.flatMap((o) => o.appointments.flatMap((a) => a.assignments)).filter((s) => s.staffId === u.id && s.active).slice(0, 10),
  }));
}
export function getProvidersWithAssignments() {
  return demoProviders;
}
export function getRecentPayments() {
  return demoOrders.flatMap((o) => o.payments).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
}
export function getRecentSupport() {
  return demoOrders.flatMap((o) => o.supports).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
}
export function getAppointmentsInRange(start: Date, end: Date) {
  const inRange = (d: Date) => d >= start && d < end;
  return demoOrders
    .flatMap((o) => o.appointments.map((a) => ({ appointment: a, order: { id: o.id, customerName: o.customerName } })))
    .filter(({ appointment }) => inRange(appointment.start ?? appointment.requestedStart))
    .sort((a, b) => (a.appointment.requestedStart.getTime() - b.appointment.requestedStart.getTime()))
    .map(({ appointment, order }) => ({ ...appointment, order }));
}
export function getOrderCountByStatus(status: string) {
  return demoOrders.filter((o) => o.status === status).length;
}
export function getActiveCleanerCount() {
  return demoUsers.filter((u) => u.role === 'CLEANER' && u.active).length;
}
export function getRepeatOrder(userId: string, id: string) {
  const order = demoOrders.find((o) => o.id === id && o.userId === userId);
  return order ?? null;
}
