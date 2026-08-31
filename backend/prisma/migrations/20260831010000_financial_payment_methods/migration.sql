CREATE TABLE "FinancialPaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialPaymentMethod_tenantId_code_key" ON "FinancialPaymentMethod"("tenantId", "code");
CREATE INDEX "FinancialPaymentMethod_tenantId_active_sortOrder_name_idx" ON "FinancialPaymentMethod"("tenantId", "active", "sortOrder", "name");
ALTER TABLE "FinancialPaymentMethod" ADD CONSTRAINT "FinancialPaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FinancialPaymentMethod" ("id","tenantId","code","name","active","sortOrder","createdAt","updatedAt")
SELECT 'fpm_' || md5(t."id" || ':' || x.code), t."id", x.code, x.name, true, x.sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (VALUES
  ('pix','PIX',10),
  ('cash','Dinheiro',20),
  ('bank_transfer','Transferência bancária',30),
  ('card','Cartão',40),
  ('boleto','Boleto',50),
  ('other','Outro',90)
) AS x(code,name,sort_order)
ON CONFLICT ("tenantId","code") DO NOTHING;

INSERT INTO "FinancialPaymentMethod" ("id","tenantId","code","name","active","sortOrder","createdAt","updatedAt")
SELECT 'fpm_' || md5(v."tenantId" || ':' || v.code), v."tenantId", v.code, v.code, true, 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT "tenantId", lower(trim("method")) AS code FROM "OrderPayment" WHERE "method" IS NOT NULL AND trim("method") <> ''
  UNION
  SELECT "tenantId", lower(trim("method")) AS code FROM "PurchasePayment" WHERE "method" IS NOT NULL AND trim("method") <> ''
  UNION
  SELECT "tenantId", lower(trim("method")) AS code FROM "FinancialEntry" WHERE "method" IS NOT NULL AND trim("method") <> ''
) v
ON CONFLICT ("tenantId","code") DO NOTHING;
