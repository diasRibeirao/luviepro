ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "amountPaidCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentDueAt" TIMESTAMP(3);

UPDATE "Order" SET "amountPaidCents" = "totalCents" WHERE "paymentStatus" = 'paid' AND "amountPaidCents" = 0;

CREATE TABLE IF NOT EXISTS "OrderPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "method" TEXT,
  "notes" TEXT,
  "actorUserId" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Order_tenantId_paymentStatus_paymentDueAt_idx" ON "Order"("tenantId", "paymentStatus", "paymentDueAt");
CREATE INDEX IF NOT EXISTS "OrderPayment_tenantId_paidAt_idx" ON "OrderPayment"("tenantId", "paidAt");
CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_paidAt_idx" ON "OrderPayment"("orderId", "paidAt");

DO $$ BEGIN
  ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
