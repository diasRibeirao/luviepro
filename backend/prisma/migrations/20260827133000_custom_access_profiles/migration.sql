-- Business custom access profiles and granular permissions
CREATE TABLE "AccessProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessProfile_tenantId_name_key" ON "AccessProfile"("tenantId","name");
CREATE INDEX "AccessProfile_tenantId_active_idx" ON "AccessProfile"("tenantId","active");
ALTER TABLE "AccessProfile" ADD CONSTRAINT "AccessProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD COLUMN "customProfileId" TEXT;
ALTER TABLE "UserInvitation" ADD COLUMN "customProfileId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_customProfileId_fkey" FOREIGN KEY ("customProfileId") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_customProfileId_fkey" FOREIGN KEY ("customProfileId") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_customProfileId_idx" ON "User"("customProfileId");
CREATE INDEX "UserInvitation_customProfileId_idx" ON "UserInvitation"("customProfileId");
