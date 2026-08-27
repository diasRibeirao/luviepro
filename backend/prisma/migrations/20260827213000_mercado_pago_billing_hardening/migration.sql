ALTER TABLE "Payment"
  ADD COLUMN "billingAction" TEXT NOT NULL DEFAULT 'new_subscription',
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "providerStatusDetail" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN "payerEmail" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "chargebackAt" TIMESTAMP(3);
