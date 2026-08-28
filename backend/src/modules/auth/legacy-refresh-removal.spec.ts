import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('legacy refresh-token removal', () => {
  it('keeps refresh hashes only on AuthSession in the Prisma schema', () => {
    const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    const userBlock = schema.match(/model User \{[\s\S]*?\n\}/)?.[0] ?? '';
    const platformBlock = schema.match(/model PlatformAdmin \{[\s\S]*?\n\}/)?.[0] ?? '';
    const sessionBlock = schema.match(/model AuthSession \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(userBlock).not.toContain('refreshTokenHash');
    expect(platformBlock).not.toContain('refreshTokenHash');
    expect(sessionBlock).toContain('refreshTokenHash String');
  });

  it('drops the obsolete principal columns in the migration', () => {
    const migration = readFileSync(resolve(process.cwd(), 'prisma/migrations/20260828001500_remove_legacy_refresh_token_hash/migration.sql'), 'utf8');
    expect(migration).toContain('ALTER TABLE "User" DROP COLUMN IF EXISTS "refreshTokenHash"');
    expect(migration).toContain('ALTER TABLE "PlatformAdmin" DROP COLUMN IF EXISTS "refreshTokenHash"');
  });
});
