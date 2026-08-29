-- Compatibility migration for databases where the dynamic catalog migration
-- may not have run yet. The original timestamp sorts before 20260829120000,
-- so both operations must be safe when the column/index do not exist.
DROP INDEX IF EXISTS "PlanLimit_active_sortOrder_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'PlanLimit'
       AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "PlanLimit" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
