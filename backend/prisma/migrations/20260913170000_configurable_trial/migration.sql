CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "trialEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trialDurationValue" INTEGER NOT NULL DEFAULT 48,
    "trialDurationUnit" TEXT NOT NULL DEFAULT 'HOURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantTrialAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "previousExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER,
    "unit" TEXT,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantTrialAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantTrialAdjustment_tenantId_createdAt_idx"
ON "TenantTrialAdjustment"("tenantId", "createdAt");

ALTER TABLE "TenantTrialAdjustment"
ADD CONSTRAINT "TenantTrialAdjustment_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "PlatformSetting" (
    "id",
    "trialEnabled",
    "trialDurationValue",
    "trialDurationUnit",
    "createdAt",
    "updatedAt"
)
VALUES (
    'default',
    true,
    48,
    'HOURS',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);