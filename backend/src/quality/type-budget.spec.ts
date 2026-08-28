import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const NON_RUNTIME_COMPATIBILITY_FILES = new Set(['api.service.ts']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    if (!path.endsWith('.ts') || path.endsWith('.spec.ts')) return [];
    return [path];
  });
}

describe('runtime production type budget', () => {
  it('does not increase explicit any debt in runtime code', () => {
    const root = join(process.cwd(), 'src');
    const matches = files(root).flatMap((file) => {
      const relativePath = relative(root, file).replace(/\\/g, '/');

      // ApiService is a source-compatibility facade retained only for legacy tests.
      // AppModule no longer registers it; api-facade-retirement.spec.ts protects
      // that architectural boundary. It therefore must not distort runtime debt.
      if (NON_RUNTIME_COMPATIBILITY_FILES.has(relativePath)) return [];

      const text = readFileSync(file, 'utf8');
      const count = (text.match(/\bany\b/g) || []).length;
      return count ? [`${relativePath}:${count}`] : [];
    });

    const total = matches.reduce(
      (sum, entry) => sum + Number(entry.split(':').pop()),
      0,
    );

    expect(total).toBeLessThanOrEqual(39);
  });
});
