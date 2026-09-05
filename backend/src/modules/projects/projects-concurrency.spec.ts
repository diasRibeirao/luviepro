import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Project progress concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/projects/projects.service.ts'),'utf8');
it('uses serializable retry',()=>{expect(s).toContain("Prisma.TransactionIsolationLevel.Serializable");expect(s).toContain("error.code === 'P2034'");});});
