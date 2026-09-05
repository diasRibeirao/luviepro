-- Repair de drift do schema da Casa Nova em HML.
-- As migrations anteriores constam como aplicadas no histórico do Prisma,
-- mas a coluna defaultsInitialized não existe fisicamente no banco.
-- Mantemos esta migration idempotente para não quebrar ambientes já corrigidos.

ALTER TABLE IF EXISTS "CasaNovaList"
  ADD COLUMN IF NOT EXISTS "defaultsInitialized" BOOLEAN NOT NULL DEFAULT false;


ALTER TABLE IF EXISTS "CasaNovaItem"
  ADD COLUMN IF NOT EXISTS "quantityOverride" INTEGER;

-- Fim da execução