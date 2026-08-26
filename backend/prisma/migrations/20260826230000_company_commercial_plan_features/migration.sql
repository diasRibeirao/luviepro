-- Round 10: company profile, commercial defaults and explicit plan capabilities
ALTER TABLE "Tenant"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "document" TEXT,
  ADD COLUMN "stateRegistration" TEXT,
  ADD COLUMN "municipalRegistration" TEXT,
  ADD COLUMN "zipCode" TEXT,
  ADD COLUMN "addressLine" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "proposalValidityDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "proposalPaymentTerms" TEXT,
  ADD COLUMN "proposalFooter" TEXT,
  ADD COLUMN "pixKey" TEXT;

ALTER TABLE "PlanLimit"
  ADD COLUMN "logoPdf" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "premiumTemplates" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exportData" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PlanLimit" SET "logoPdf" = true, "premiumTemplates" = false, "exportData" = false WHERE "plan" = 'starter';
UPDATE "PlanLimit" SET "logoPdf" = true, "premiumTemplates" = false, "exportData" = false WHERE "plan" = 'pro';
UPDATE "PlanLimit" SET "logoPdf" = true, "premiumTemplates" = true, "exportData" = true WHERE "plan" = 'business';
