-- Round 10: persistent AuthSession is now the only refresh-token store.
-- Any pre-Round-7 refresh token without `sid` becomes invalid after this migration.
ALTER TABLE "User" DROP COLUMN IF EXISTS "refreshTokenHash";
ALTER TABLE "PlatformAdmin" DROP COLUMN IF EXISTS "refreshTokenHash";
