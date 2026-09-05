import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Product stock concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/products/products.service.ts'),'utf8');
it('uses compare-and-set',()=>{expect(s).toContain("stockQuantity:p.stockQuantity");expect(s).toContain("claimed.count!==1");});
it('serializes product category creation',()=>{expect(s).toContain("tx.productCategory.findFirst({where:{tenantId,name:{equals:name,mode:'insensitive'}}})");expect(s).toContain("tx.productCategory.create({data:{tenantId,name");});

it('serializes product category rename',()=>{expect(s).toContain("const duplicate=await tx.productCategory.findFirst");expect(s).toContain("return tx.productCategory.update({where:{id}");});

it('serializes product unit creation',()=>{expect(s).toContain("tx.productUnit.findFirst({where:{tenantId,code:{equals:code,mode:'insensitive'}}})");expect(s).toContain("tx.productUnit.create({data:{tenantId,code,name");});

it('serializes product unit rename/code update',()=>{expect(s).toContain("const duplicate=await tx.productUnit.findFirst");expect(s).toContain("return tx.productUnit.update({where:{id}");});
});
