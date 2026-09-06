import * as fs from 'node:fs';
import * as path from 'node:path';

describe('commercial plan catalog v187',()=>{
  const seed=fs.readFileSync(path.join(__dirname,'..','prisma','seed.ts'),'utf8');
  const migration=fs.readFileSync(path.join(__dirname,'..','prisma','migrations','20260906123000_commercial_plan_matrix_v187','migration.sql'),'utf8');

  it.each([
    ['basic',10,10,1,6990],
    ['starter',30,30,1,9990],
    ['pro',100,100,3,11990],
    ['business',-1,-1,10,14990],
  ])('keeps %s limits and monthly price aligned',(plan,clients,quotes,users,monthly)=>{
    expect(seed).toContain(`plan:'${plan}'`);
    expect(seed).toContain(`maxClients:${clients},maxQuotesPerMonth:${quotes},maxUsers:${users}`);
    expect(seed).toContain(`monthlyPriceCents:${monthly}`);
    expect(migration).toContain(`'${plan}'`);
    expect(migration).toContain(String(monthly));
  });

  it('adds the Basic plan through an idempotent upsert',()=>{
    expect(migration).toContain('ON CONFLICT ("plan") DO UPDATE SET');
  });
});
