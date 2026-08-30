ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "active" DESC, "name" ASC, "id" ASC) * 10 AS position
  FROM "Service"
)
UPDATE "Service" s SET "sortOrder" = ranked.position
FROM ranked WHERE ranked."id" = s."id" AND s."sortOrder" = 0;

CREATE INDEX IF NOT EXISTS "Service_tenantId_sortOrder_idx" ON "Service"("tenantId", "sortOrder");
