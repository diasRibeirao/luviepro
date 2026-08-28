import {readFileSync} from 'fs';import {resolve} from 'path';
describe('Prisma seed client path',()=>{it('uses custom generated client',()=>{const s=readFileSync(resolve(process.cwd(),'prisma/seed.ts'),'utf8');expect(s).toContain("from '../../generated-prisma'");expect(s).not.toContain("from '@prisma/client'");});});
