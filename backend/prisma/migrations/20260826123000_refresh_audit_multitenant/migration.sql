ALTER TABLE "User" ADD COLUMN "refreshTokenHash" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "QuoteStage" ADD COLUMN "tenantId" TEXT;
UPDATE "QuoteItem" qi SET "tenantId" = q."tenantId" FROM "Quote" q WHERE qi."quoteId" = q."id";
UPDATE "QuoteStage" qs SET "tenantId" = qi."tenantId" FROM "QuoteItem" qi WHERE qs."quoteItemId" = qi."id";
ALTER TABLE "QuoteItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "QuoteStage" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "QuoteItem_tenantId_quoteId_idx" ON "QuoteItem"("tenantId", "quoteId");
CREATE INDEX "QuoteStage_tenantId_quoteItemId_idx" ON "QuoteStage"("tenantId", "quoteItemId");
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_entity_entityId_idx" ON "AuditLog"("tenantId", "entity", "entityId");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
