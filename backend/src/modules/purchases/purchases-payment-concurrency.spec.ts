import { readFileSync } from 'fs';
import { resolve } from 'path';
describe('Purchase payment concurrency safeguards',()=>{
 const source=readFileSync(resolve(process.cwd(),'src/modules/purchases/purchases.service.ts'),'utf8');
 it('claims the previous paid balance atomically before creating a payment',()=>{
  expect(source).toContain("tx.purchaseOrder.updateMany({where:{id,tenantId,amountPaidCents:current.amountPaidCents,status:{not:'canceled'}}");
  expect(source).toContain("if(claimed.count!==1)");
  expect(source).toContain("O saldo desta compra foi alterado por outra operação");
 });
});
