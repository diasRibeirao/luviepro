ALTER TABLE "CasaNovaList" ADD COLUMN "clientId" TEXT;
CREATE INDEX "CasaNovaList_clientId_idx" ON "CasaNovaList"("clientId");
ALTER TABLE "CasaNovaList" ADD CONSTRAINT "CasaNovaList_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
