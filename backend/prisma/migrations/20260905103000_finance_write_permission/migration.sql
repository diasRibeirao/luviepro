-- Add explicit write permission without breaking existing custom profiles.
-- Existing profiles that had finance.read already had write access in the previous API,
-- so preserve that behavior during the migration.
UPDATE "AccessProfile"
SET "permissions" = CASE
  WHEN "permissions" @> '["finance.write"]'::jsonb THEN "permissions"
  ELSE "permissions" || '["finance.write"]'::jsonb
END
WHERE "permissions" @> '["finance.read"]'::jsonb;
