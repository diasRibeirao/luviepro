ALTER TABLE "Tenant" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Tenants existentes já estavam em uso antes da introdução do onboarding obrigatório.
UPDATE "Tenant" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP WHERE "onboardingCompletedAt" IS NULL;
