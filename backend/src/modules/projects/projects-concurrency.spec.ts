import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Project progress concurrency', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/modules/projects/projects.service.ts'),
    'utf8',
  );

  it('uses serializable retry', () => {
    expect(source).toMatch(/isolationLevel\s*:\s*['"]Serializable['"]/);
    expect(source).toContain("'P2034'");
    expect(source).toContain('attempt < 3');
  });
});
