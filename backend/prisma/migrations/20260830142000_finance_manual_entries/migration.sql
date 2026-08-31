CREATE TABLE IF NOT EXISTS "FinancialCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "FinancialEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "categoryId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "description" TEXT NOT NULL,
  "counterparty" TEXT,
  "amountCents" INTEGER NOT NULL,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "method" TEXT,
  "notes" TEXT,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinancialCategory_tenantId_type_name_key" ON "FinancialCategory"("tenantId", "type", "name");
CREATE INDEX IF NOT EXISTS "FinancialCategory_tenantId_type_active_sortOrder_idx" ON "FinancialCategory"("tenantId", "type", "active", "sortOrder");
CREATE INDEX IF NOT EXISTS "FinancialEntry_tenantId_type_status_dueAt_idx" ON "FinancialEntry"("tenantId", "type", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "FinancialEntry_tenantId_paidAt_idx" ON "FinancialEntry"("tenantId", "paidAt");
CREATE INDEX IF NOT EXISTS "FinancialEntry_tenantId_categoryId_idx" ON "FinancialEntry"("tenantId", "categoryId");
DO $$ BEGIN
  ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
