CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'mercado_pago',
  "providerPaymentId" TEXT,
  "providerPreferenceId" TEXT,
  "externalReference" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checkoutUrl" TEXT,
  "paymentMethod" TEXT,
  "paidAt" TIMESTAMP(3),
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_providerPreferenceId_key" ON "Payment"("providerPreferenceId");
CREATE UNIQUE INDEX "Payment_externalReference_key" ON "Payment"("externalReference");
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
