ALTER TABLE "PlanLimit"
  ADD COLUMN "standardRoles" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customRoles" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "granularPermissions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auditAccess" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PlanLimit" SET "standardRoles" = true WHERE "plan" IN ('pro','business');
UPDATE "PlanLimit" SET "customRoles" = true, "granularPermissions" = true, "auditAccess" = true WHERE "plan" = 'business';
