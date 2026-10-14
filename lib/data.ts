// Server-side data facade. In real mode these functions run the exact database
// queries the pages always used. In demo mode they return fictional fixtures
// from lib/demo/fixtures.ts, so no database connection is ever opened.

import { getDb } from './db';
import type { Prisma } from '@prisma/client';
import { isDemoMode } from './demo/mode';
import { readOrder, type FullOrder } from './orders';
import { readProfile } from './profile';
import { DomainError, type Actor } from './domain';
import * as demo from './demo/fixtures';

export async function getServiceContent(code: string) {
  if (isDemoMode()) return demo.getServiceContent(code) as unknown as Awaited<ReturnType<typeof realServiceContent>>;
  return realServiceContent(code);
}
function realServiceContent(code: string) {
  return getDb().service.findUnique({ where: { code } });
}

export async function getSettings(keys: string[]) {
  if (isDemoMode()) return demo.getSettings(keys) as unknown as Awaited<ReturnType<typeof realSettings>>;
  return realSettings(keys);
}
function realSettings(keys: string[]) {
  return getDb().setting.findMany({ where: { key: { in: keys } } });
}

export async function getSettingValue(key: string) {
  if (isDemoMode()) return demo.getSettingValue(key) as unknown as Awaited<ReturnType<typeof realSettingValue>>;
  return realSettingValue(key);
}
function realSettingValue(key: string) {
  return getDb().setting.findUnique({ where: { key } });
}

export async function getAllServices() {
  if (isDemoMode()) return demo.getServices() as unknown as Awaited<ReturnType<typeof realAllServices>>;
  return realAllServices();
}
function realAllServices() {
  return getDb().service.findMany();
}

export async function getServicesWithPrices() {
  if (isDemoMode()) return demo.getServicesWithPrices() as unknown as Awaited<ReturnType<typeof realServicesWithPrices>>;
  return realServicesWithPrices();
}
function realServicesWithPrices() {
  return getDb().service.findMany({ include: { prices: { orderBy: { effectiveAt: 'desc' }, take: 1 } } });
}

export async function getAreasWithCity() {
  if (isDemoMode()) return demo.getAreasWithCity() as unknown as Awaited<ReturnType<typeof realAreasWithCity>>;
  return realAreasWithCity();
}
function realAreasWithCity() {
  return getDb().serviceArea.findMany({ include: { city: true } });
}

export async function findServiceArea(name: string) {
  if (isDemoMode()) return demo.findServiceArea(name) as unknown as Awaited<ReturnType<typeof realFindServiceArea>>;
  return realFindServiceArea(name);
}
function realFindServiceArea(name: string) {
  return getDb().serviceArea.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, city: { name: 'Kozhikode' } } });
}

export async function getDashboardOrders(userId: string) {
  if (isDemoMode()) return demo.getOrdersByUser(userId) as unknown as Awaited<ReturnType<typeof realDashboardOrders>>;
  return realDashboardOrders(userId);
}
function realDashboardOrders(userId: string) {
  return getDb().order.findMany({ where: { userId }, include: { appointments: true, quotes: { orderBy: { version: 'desc' }, take: 1 }, cleaning: true, laundry: true }, orderBy: { createdAt: 'desc' }, take: 30 });
}

export async function getBookings(userId: string, tab: 'upcoming' | 'past' | 'cancelled', page: number) {
  if (isDemoMode()) return demo.getBookingsByUser(userId, tab) as unknown as Awaited<ReturnType<typeof realBookings>>;
  return realBookings(userId, tab, page);
}
async function realBookings(userId: string, tab: 'upcoming' | 'past' | 'cancelled', page: number) {
  const status: Prisma.OrderWhereInput['status'] = tab === 'past' ? 'COMPLETED' : tab === 'cancelled' ? 'CANCELLED' : { notIn: ['COMPLETED', 'CANCELLED'] };
  const where = { userId, status };
  const [orders, count] = await Promise.all([
    getDb().order.findMany({ where, include: { cleaning: true, laundry: true, address: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 10, take: 10 }),
    getDb().order.count({ where }),
  ]);
  return { orders, count };
}

export async function getOrder(actor: Actor, id: string): Promise<FullOrder> {
  if (isDemoMode()) {
    const order = demo.getOrderById(id);
    if (!order) throw new DomainError('Booking not found.', 404);
    return order as unknown as FullOrder;
  }
  return readOrder(actor, id);
}

export async function getProfile(userId: string) {
  if (isDemoMode()) return demo.getProfile(userId) as unknown as Awaited<ReturnType<typeof readProfile>>;
  return readProfile(userId);
}

export async function getStaffJobs(userId: string) {
  if (isDemoMode()) return demo.getStaffJobs(userId) as unknown as Awaited<ReturnType<typeof realStaffJobs>>;
  return realStaffJobs(userId);
}
function realStaffJobs(userId: string) {
  return getDb().order.findMany({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, appointments: { some: { assignments: { some: { staffId: userId, active: true } } } } },
    include: { address: true, cleaning: true, laundry: { include: { bags: true } }, user: { select: { phone: true } }, appointments: { include: { assignments: { where: { active: true }, include: { staff: { select: { id: true, name: true } } } } } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
}

export async function getRepeatOrder(userId: string, id: string) {
  if (isDemoMode()) return demo.getRepeatOrder(userId, id) as unknown as Awaited<ReturnType<typeof realRepeatOrder>>;
  return realRepeatOrder(userId, id);
}
function realRepeatOrder(userId: string, id: string) {
  return getDb().order.findFirst({ where: { id, userId }, include: { address: true, items: { include: { service: true } } } });
}

// --- administrator views ----------------------------------------------------

export type AdminOrderFilter = { status?: string; laundryOnly?: boolean; page: number };

export async function getAdminOrders(filter: AdminOrderFilter) {
  if (isDemoMode()) {
    const filtered = demo.demoOrders
      .filter((o) => (!filter.status || o.status === filter.status) && (!filter.laundryOnly || o.laundry))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return filtered.slice((filter.page - 1) * 12, filter.page * 12) as unknown as Awaited<ReturnType<typeof realAdminOrders>>;
  }
  return realAdminOrders(filter);
}
function realAdminOrders(filter: AdminOrderFilter) {
  const where = { ...(filter.status ? { status: filter.status as 'REQUESTED' } : {}), ...(filter.laundryOnly ? { laundry: { isNot: null } } : {}) };
  return getDb().order.findMany({ where, include: { cleaning: true, laundry: true, address: true, quotes: { orderBy: { version: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, skip: (filter.page - 1) * 12, take: 12 });
}

export async function getAdminOrderCount(filter: Omit<AdminOrderFilter, 'page'>) {
  if (isDemoMode()) return demo.demoOrders.filter((o) => (!filter.status || o.status === filter.status) && (!filter.laundryOnly || o.laundry)).length;
  const where = { ...(filter.status ? { status: filter.status as 'REQUESTED' } : {}), ...(filter.laundryOnly ? { laundry: { isNot: null } } : {}) };
  return getDb().order.count({ where });
}

export async function getBasicStaff() {
  if (isDemoMode()) return demo.getBasicStaff() as unknown as Awaited<ReturnType<typeof realBasicStaff>>;
  return realBasicStaff();
}
function realBasicStaff() {
  return getDb().user.findMany({ where: { role: { notIn: ['CUSTOMER', 'ADMIN'] } }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } });
}

export async function getAssignableStaff() {
  if (isDemoMode()) return demo.getBasicStaff() as unknown as Awaited<ReturnType<typeof realAssignableStaff>>;
  return realAssignableStaff();
}
function realAssignableStaff() {
  return getDb().user.findMany({ where: { active: true, role: { notIn: ['CUSTOMER', 'ADMIN'] } }, select: { id: true, name: true, role: true } });
}

export async function getNonAdminUsers() {
  if (isDemoMode()) return demo.getNonAdminUsers() as unknown as Awaited<ReturnType<typeof realNonAdminUsers>>;
  return realNonAdminUsers();
}
function realNonAdminUsers() {
  return getDb().user.findMany({ where: { role: { not: 'ADMIN' } }, select: { id: true, name: true, email: true, role: true, active: true }, take: 100, orderBy: { name: 'asc' } });
}

export async function getStaffWithAvailability() {
  if (isDemoMode()) return demo.getStaffWithAvailability() as unknown as Awaited<ReturnType<typeof realStaffWithAvailability>>;
  return realStaffWithAvailability();
}
function realStaffWithAvailability() {
  return getDb().user.findMany({ where: { role: { notIn: ['CUSTOMER', 'ADMIN'] } }, include: { availability: { where: { end: { gte: new Date() } }, orderBy: { start: 'asc' }, take: 10 }, assignments: { where: { active: true, busyUntil: { gte: new Date() } }, take: 10 } } });
}

export async function getProvidersWithAssignments() {
  if (isDemoMode()) return demo.getProvidersWithAssignments() as unknown as Awaited<ReturnType<typeof realProvidersWithAssignments>>;
  return realProvidersWithAssignments();
}
function realProvidersWithAssignments() {
  return getDb().thirdPartyProvider.findMany({ include: { assignments: { include: { appointment: true } } } });
}

export async function getRecentPayments() {
  if (isDemoMode()) return demo.getRecentPayments() as unknown as Awaited<ReturnType<typeof realRecentPayments>>;
  return realRecentPayments();
}
function realRecentPayments() {
  return getDb().payment.findMany({ include: { refunds: true }, orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function getRecentSupport() {
  if (isDemoMode()) return demo.getRecentSupport() as unknown as Awaited<ReturnType<typeof realRecentSupport>>;
  return realRecentSupport();
}
function realRecentSupport() {
  return getDb().supportRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function getAppointmentsInRange(start: Date, end: Date) {
  if (isDemoMode()) return demo.getAppointmentsInRange(start, end) as unknown as Awaited<ReturnType<typeof realAppointmentsInRange>>;
  return realAppointmentsInRange(start, end);
}
function realAppointmentsInRange(start: Date, end: Date) {
  return getDb().appointment.findMany({
    where: { OR: [{ start: { gte: start, lt: end } }, { start: null, requestedStart: { gte: start, lt: end } }] },
    include: { assignments: { include: { staff: true } }, order: { select: { id: true, customerName: true } } },
    orderBy: { requestedStart: 'asc' },
  });
}

export async function getOrderCountByStatus(status: string) {
  if (isDemoMode()) return demo.getOrderCountByStatus(status);
  return getDb().order.count({ where: { status: status as 'REQUESTED' } });
}

export async function getActiveCleanerCount() {
  if (isDemoMode()) return demo.getActiveCleanerCount();
  return getDb().user.count({ where: { role: 'CLEANER', active: true } });
}
