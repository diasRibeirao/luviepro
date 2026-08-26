ALTER TABLE "Service" ADD COLUMN "variableCostMode" TEXT NOT NULL DEFAULT 'per_day';
ALTER TABLE "Service" ADD COLUMN "marginBase" TEXT NOT NULL DEFAULT 'daily';
