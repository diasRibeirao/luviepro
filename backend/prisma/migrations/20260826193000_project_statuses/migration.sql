CREATE TABLE "ProjectStatus" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#2F6B4F',
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectStatus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectStatus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProjectStatus_tenantId_key_key" ON "ProjectStatus"("tenantId", "key");
CREATE INDEX "ProjectStatus_tenantId_active_position_idx" ON "ProjectStatus"("tenantId", "active", "position");
INSERT INTO "ProjectStatus" ("id","tenantId","key","name","color","position","active","updatedAt")
SELECT 'ps_' || md5("id" || '_scheduled'), "id", 'scheduled', 'Agendados', '#C9A84C', 0, true, CURRENT_TIMESTAMP FROM "Tenant";
INSERT INTO "ProjectStatus" ("id","tenantId","key","name","color","position","active","updatedAt")
SELECT 'ps_' || md5("id" || '_in_progress'), "id", 'in_progress', 'Em andamento', '#2F6B4F', 1, true, CURRENT_TIMESTAMP FROM "Tenant";
INSERT INTO "ProjectStatus" ("id","tenantId","key","name","color","position","active","updatedAt")
SELECT 'ps_' || md5("id" || '_completed'), "id", 'completed', 'Concluídos', '#6F8C78', 2, true, CURRENT_TIMESTAMP FROM "Tenant";
