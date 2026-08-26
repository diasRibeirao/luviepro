-- Round 11: professional client and service registration fields
ALTER TABLE "Client"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "document" TEXT,
  ADD COLUMN "stateRegistration" TEXT,
  ADD COLUMN "municipalRegistration" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "zipCode" TEXT,
  ADD COLUMN "addressLine" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "state" TEXT;

CREATE INDEX "Client_tenantId_document_idx" ON "Client"("tenantId", "document");

ALTER TABLE "Service"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "billingUnit" TEXT NOT NULL DEFAULT 'daily';
