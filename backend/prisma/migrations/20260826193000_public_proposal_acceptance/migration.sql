-- Public proposal sharing and client decision
ALTER TABLE "Quote"
  ADD COLUMN "publicToken" TEXT,
  ADD COLUMN "publicSharedAt" TIMESTAMP(3),
  ADD COLUMN "clientDecision" TEXT,
  ADD COLUMN "clientDecisionAt" TIMESTAMP(3),
  ADD COLUMN "clientDecisionName" TEXT;

CREATE UNIQUE INDEX "Quote_publicToken_key" ON "Quote"("publicToken");
