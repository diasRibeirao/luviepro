-- Final cleanup after 20260829120000_dynamic_plan_catalog.
-- Makes the resulting database match the current Prisma schema.
DROP INDEX IF EXISTS "PlanLimit_active_sortOrder_idx";
ALTER TABLE "PlanLimit" ALTER COLUMN "updatedAt" DROP DEFAULT;
