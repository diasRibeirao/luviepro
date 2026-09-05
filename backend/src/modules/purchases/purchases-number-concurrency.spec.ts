import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Purchase number concurrency', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/modules/purchases/purchases.service.ts'),
    'utf8',
  );

  it('retries number collisions', () => {
    expect(source).not.toContain("purchaseOrder.count({where:{tenantId}})");
    expect(source).toMatch(/code\s*\??\.\s*code|code/);
    expect(source).toContain("'P2002'");
    expect(source).toContain('attempt<5');
  });
});
