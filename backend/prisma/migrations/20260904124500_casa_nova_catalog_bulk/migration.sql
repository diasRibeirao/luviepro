ALTER TABLE "CasaNovaList" ADD COLUMN "defaultsInitialized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CasaNovaItem" ADD COLUMN "quantityOverride" INTEGER;
