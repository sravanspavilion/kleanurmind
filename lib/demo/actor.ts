// Fictional identities used while the public demo is enabled. These replace the
// signed-in user so pages render without authentication. They never map to a
// real database row.

export type DemoActor = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  phone: string | null;
  image: string | null;
  role: string;
  active: boolean;
  providerId: string | null;
};

export const DEMO_CUSTOMER_ID = 'demo-customer';
export const DEMO_ADMIN_ID = 'demo-admin';
export const DEMO_STAFF_ID = 'demo-staff-cleaner';

export const demoCustomer: DemoActor = {
  id: DEMO_CUSTOMER_ID,
  name: 'Ananya Menon',
  email: 'ananya.menon@example.test',
  emailVerified: new Date('2026-01-05T04:30:00.000Z'),
  phone: '+91 98470 12345',
  image: null,
  role: 'CUSTOMER',
  active: true,
  providerId: null,
};

export const demoAdmin: DemoActor = {
  id: DEMO_ADMIN_ID,
  name: 'Operations Admin',
  email: 'admin@example.test',
  emailVerified: new Date('2026-01-05T04:30:00.000Z'),
  phone: null,
  image: null,
  role: 'ADMIN',
  active: true,
  providerId: null,
};

export const demoStaff: DemoActor = {
  id: DEMO_STAFF_ID,
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@example.test',
  emailVerified: new Date('2026-01-05T04:30:00.000Z'),
  phone: '+91 98470 55221',
  image: null,
  role: 'CLEANER',
  active: true,
  providerId: null,
};

const STAFF_ROLES = ['CLEANER', 'LAUNDRY', 'DELIVERY', 'PARTNER'];

// Pick the identity that matches the roles a page asks for, so the customer,
// operations and staff portals all render with sensible sample data.
export function demoActorFor(roles?: string[]): DemoActor {
  if (roles?.includes('CUSTOMER')) return demoCustomer;
  if (roles?.includes('ADMIN')) return demoAdmin;
  if (roles?.some((role) => STAFF_ROLES.includes(role))) return demoStaff;
  if (roles && roles.length > 0) return demoStaff;
  return demoCustomer;
}
