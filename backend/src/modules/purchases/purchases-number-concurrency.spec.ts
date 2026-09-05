import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Purchase number concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/purchases/purchases.service.ts'),'utf8');
it('retries number collisions',()=>{expect(s).not.toContain("purchaseOrder.count({where:{tenantId}})");expect(s).toContain("error.code==='P2002'");expect(s).toContain("attempt<5");});});
