import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
const testUrl=process.env.TEST_DATABASE_URL;
if(!testUrl||!new URL(testUrl).pathname.endsWith('_test'))throw new Error('Integration tests require TEST_DATABASE_URL pointing to a dedicated database ending in _test.');
process.env.DATABASE_URL=testUrl;

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure test database is clean
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Order", "Quote", "Appointment", "Assignment", "CleaningJob", "LaundryJob", "LaundryBag", "Handover", "Payment", "Refund", "SupportRequest", "AuditEvent", "Upload", "Outbox", "RateLimit", "Setting", "ServiceArea", "City", "Service", "PriceVersion", "OrderItem", "QuoteItem", "ThirdPartyProvider", "CustomerProfile", "Address", "StaffAvailability", "NotificationPreference" RESTART IDENTITY CASCADE;`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };