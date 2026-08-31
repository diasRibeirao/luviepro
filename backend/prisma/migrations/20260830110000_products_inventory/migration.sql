CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_tenantId_name_key" ON "ProductCategory"("tenantId","name");
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_active_idx" ON "ProductCategory"("tenantId","active");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "categoryId" TEXT, "name" TEXT NOT NULL, "sku" TEXT NOT NULL,
  "description" TEXT, "unit" TEXT NOT NULL DEFAULT 'un', "barcode" TEXT, "supplierName" TEXT,
  "costCents" INTEGER NOT NULL DEFAULT 0, "salePriceCents" INTEGER NOT NULL DEFAULT 0, "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "reservedQuantity" INTEGER NOT NULL DEFAULT 0, "minimumStock" INTEGER NOT NULL DEFAULT 0, "imageUrl" TEXT,
  "weightGrams" INTEGER, "widthCm" DECIMAL(10,2), "heightCm" DECIMAL(10,2), "lengthCm" DECIMAL(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_sku_key" ON "Product"("tenantId","sku");
CREATE INDEX IF NOT EXISTS "Product_tenantId_name_idx" ON "Product"("tenantId","name");
CREATE INDEX IF NOT EXISTS "Product_tenantId_active_idx" ON "Product"("tenantId","active");
CREATE INDEX IF NOT EXISTS "Product_tenantId_categoryId_idx" ON "Product"("tenantId","categoryId");

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "productId" TEXT NOT NULL, "type" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL, "unitCostCents" INTEGER, "reason" TEXT, "referenceType" TEXT, "referenceId" TEXT, "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_productId_createdAt_idx" ON "StockMovement"("tenantId","productId","createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_type_createdAt_idx" ON "StockMovement"("tenantId","type","createdAt");
