-- DropIndex
DROP INDEX "Order_tenantId_createdAt_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductUnit" ALTER COLUMN "updatedAt" DROP DEFAULT;
