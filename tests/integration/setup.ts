import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure test database is clean
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Order", "Quote", "Appointment", "Assignment", "CleaningJob", "LaundryJob", "LaundryBag", "Handover", "Payment", "Refund", "SupportRequest", "AuditEvent", "Upload", "Outbox", "RateLimit", "Setting", "ServiceArea", "City", "Service", "PriceVersion", "OrderItem", "QuoteItem", "ThirdPartyProvider", "CustomerProfile", "Address", "StaffAvailability", "NotificationPreference" RESTART IDENTITY CASCADE;`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };