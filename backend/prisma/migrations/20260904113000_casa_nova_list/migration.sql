CREATE TABLE "CasaNovaList" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "guests" INTEGER NOT NULL DEFAULT 2,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CasaNovaList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CasaNovaItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "baseQuantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "isScalable" BOOLEAN NOT NULL DEFAULT true,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CasaNovaItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CasaNovaList_tenantId_key" ON "CasaNovaList"("tenantId");
CREATE INDEX "CasaNovaItem_tenantId_category_idx" ON "CasaNovaItem"("tenantId", "category");
CREATE INDEX "CasaNovaItem_listId_checked_idx" ON "CasaNovaItem"("listId", "checked");

ALTER TABLE "CasaNovaList" ADD CONSTRAINT "CasaNovaList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CasaNovaItem" ADD CONSTRAINT "CasaNovaItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CasaNovaItem" ADD CONSTRAINT "CasaNovaItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CasaNovaList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
