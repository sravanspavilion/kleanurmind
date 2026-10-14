-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerPhone" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "discountPaise" INTEGER NOT NULL DEFAULT 0;

