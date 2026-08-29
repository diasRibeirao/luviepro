-- DropIndex
-- DROP INDEX "PlanLimit_active_sortOrder_idx";
DROP INDEX IF EXISTS "PlanLimit_active_sortOrder_idx";

-- AlterTable
ALTER TABLE "PlanLimit" ALTER COLUMN "updatedAt" DROP DEFAULT;
