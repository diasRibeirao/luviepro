CREATE TABLE "ProjectOrganizerUsage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "chargeUnitCents" INTEGER NOT NULL DEFAULT 0,
  "costUnitCents" INTEGER NOT NULL DEFAULT 0,
  "charged" BOOLEAN NOT NULL DEFAULT false,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectOrganizerUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectOrganizerUsage_projectId_productId_key" ON "ProjectOrganizerUsage"("projectId", "productId");
CREATE INDEX "ProjectOrganizerUsage_tenantId_projectId_idx" ON "ProjectOrganizerUsage"("tenantId", "projectId");
CREATE INDEX "ProjectOrganizerUsage_tenantId_charged_paid_idx" ON "ProjectOrganizerUsage"("tenantId", "charged", "paid");
ALTER TABLE "ProjectOrganizerUsage" ADD CONSTRAINT "ProjectOrganizerUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectOrganizerUsage" ADD CONSTRAINT "ProjectOrganizerUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "Service" SET "dailyRateCents"=455250
WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug"='luvie-organiza') AND "name"='Mudança residencial';
UPDATE "Service" SET "dailyRateCents"=359250
WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug"='luvie-organiza') AND "name"='Organização de ambientes';
UPDATE "ServiceTeamMember" SET "dailyRateCents"=455250
WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug"='luvie-organiza') AND "role" LIKE 'Mudança residencial%P.O.%';
UPDATE "ServiceTeamMember" SET "dailyRateCents"=359250
WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug"='luvie-organiza') AND "role" LIKE 'Organização de ambientes%P.O.%';
UPDATE "Service" SET "dailyRateCents"=814500
WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug"='luvie-organiza') AND "name"='Mudança residencial + Organização de ambientes';
