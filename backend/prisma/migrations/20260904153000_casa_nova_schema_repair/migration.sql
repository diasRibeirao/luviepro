-- Reparo idempotente para ambientes em que a evolução do catálogo Casa Nova
-- foi publicada no frontend/backend antes das colunas chegarem ao banco.
ALTER TABLE IF EXISTS "CasaNovaList"
  ADD COLUMN IF NOT EXISTS "defaultsInitialized" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS "CasaNovaItem"
  ADD COLUMN IF NOT EXISTS "quantityOverride" INTEGER;
