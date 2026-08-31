ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentDueAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "amountPaidCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PurchasePayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "method" TEXT,
  "notes" TEXT,
  "actorUserId" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchasePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchasePayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PurchasePayment_tenantId_paidAt_idx" ON "PurchasePayment"("tenantId", "paidAt");
CREATE INDEX IF NOT EXISTS "PurchasePayment_purchaseOrderId_paidAt_idx" ON "PurchasePayment"("purchaseOrderId", "paidAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_paymentStatus_paymentDueAt_idx" ON "PurchaseOrder"("tenantId", "paymentStatus", "paymentDueAt");
