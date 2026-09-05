import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Product stock concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/products/products.service.ts'),'utf8');
it('uses compare-and-set',()=>{expect(s).toContain("stockQuantity:p.stockQuantity");expect(s).toContain("claimed.count!==1");});});
