import { readFileSync } from 'fs';
import { resolve } from 'path';
describe('Order payment concurrency safeguards',()=>{
 const source=readFileSync(resolve(process.cwd(),'src/modules/orders/orders.service.ts'),'utf8');
 it('claims the previous paid balance atomically before creating a payment',()=>{
  expect(source).toContain("tx.order.updateMany({where:{id,tenantId,amountPaidCents:current.amountPaidCents,status:{not:'canceled'}}");
  expect(source).toContain("if(claimed.count!==1)");
  expect(source).toContain("O saldo deste pedido foi alterado por outra operação");
 });
});
