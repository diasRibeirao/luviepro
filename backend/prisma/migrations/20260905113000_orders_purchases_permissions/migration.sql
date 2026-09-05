-- Split Orders and Purchases permissions from Quotes while preserving current access.

UPDATE "AccessProfile"
SET "permissions" =
  CASE WHEN "permissions" @> '["orders.read"]'::jsonb
       THEN "permissions"
       ELSE "permissions" || '["orders.read"]'::jsonb END
WHERE "permissions" @> '["quotes.read"]'::jsonb;

UPDATE "AccessProfile"
SET "permissions" =
  CASE WHEN "permissions" @> '["purchases.read"]'::jsonb
       THEN "permissions"
       ELSE "permissions" || '["purchases.read"]'::jsonb END
WHERE "permissions" @> '["quotes.read"]'::jsonb;

UPDATE "AccessProfile"
SET "permissions" =
  CASE WHEN "permissions" @> '["orders.write"]'::jsonb
       THEN "permissions"
       ELSE "permissions" || '["orders.write"]'::jsonb END
WHERE "permissions" @> '["quotes.write"]'::jsonb;

UPDATE "AccessProfile"
SET "permissions" =
  CASE WHEN "permissions" @> '["purchases.write"]'::jsonb
       THEN "permissions"
       ELSE "permissions" || '["purchases.write"]'::jsonb END
WHERE "permissions" @> '["quotes.write"]'::jsonb;
