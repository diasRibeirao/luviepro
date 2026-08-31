CREATE TABLE IF NOT EXISTS "ProductUnit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductUnit_tenantId_code_key" ON "ProductUnit"("tenantId","code");
CREATE INDEX IF NOT EXISTS "ProductUnit_tenantId_active_sortOrder_idx" ON "ProductUnit"("tenantId","active","sortOrder");

-- Unidades padrão para cada empresa.
INSERT INTO "ProductUnit" ("id","tenantId","code","name","active","sortOrder","createdAt","updatedAt")
SELECT md5(t."id" || ':unit:' || v.code), t."id", v.code, v.name, true, v.sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (VALUES
  ('un','Unidade',10),
  ('kit','Kit',20),
  ('cx','Caixa',30),
  ('pct','Pacote',40),
  ('m','Metro',50),
  ('kg','Quilograma',60)
) AS v(code,name,sort_order)
ON CONFLICT ("tenantId","code") DO NOTHING;

-- Preserva unidades livres já usadas em produtos antigos.
INSERT INTO "ProductUnit" ("id","tenantId","code","name","active","sortOrder","createdAt","updatedAt")
SELECT md5(p."tenantId" || ':unit:legacy:' || lower(trim(p."unit"))), p."tenantId", lower(trim(p."unit")), trim(p."unit"), true, 999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
WHERE trim(coalesce(p."unit",'')) <> ''
GROUP BY p."tenantId", lower(trim(p."unit")), trim(p."unit")
ON CONFLICT ("tenantId","code") DO NOTHING;
