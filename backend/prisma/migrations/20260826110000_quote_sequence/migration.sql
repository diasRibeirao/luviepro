CREATE TABLE "QuoteSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuoteSequence_tenantId_year_key" ON "QuoteSequence"("tenantId", "year");
