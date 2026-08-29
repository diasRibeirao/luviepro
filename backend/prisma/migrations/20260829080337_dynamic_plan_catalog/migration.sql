-- DropIndex
DROP INDEX "PlanLimit_active_sortOrder_idx";

-- AlterTable
ALTER TABLE "PlanLimit" ALTER COLUMN "updatedAt" DROP DEFAULT;
