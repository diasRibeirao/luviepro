ALTER TABLE "PlanLimit"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PlanLimit" SET
  "name" = CASE "plan" WHEN 'starter' THEN 'Starter' WHEN 'pro' THEN 'Pro' WHEN 'business' THEN 'Business' ELSE INITCAP(REPLACE("plan", '-', ' ')) END,
  "description" = CASE "plan" WHEN 'starter' THEN 'Para quem está começando' WHEN 'pro' THEN 'Para quem quer crescer' WHEN 'business' THEN 'Para equipes e estúdios' ELSE NULL END,
  "sortOrder" = CASE "plan" WHEN 'starter' THEN 10 WHEN 'pro' THEN 20 WHEN 'business' THEN 30 ELSE 100 END;

ALTER TABLE "PlanLimit" ALTER COLUMN "name" SET NOT NULL;
CREATE INDEX "PlanLimit_active_sortOrder_idx" ON "PlanLimit"("active", "sortOrder");
