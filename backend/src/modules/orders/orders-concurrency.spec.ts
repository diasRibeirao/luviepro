import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Order concurrency safeguards',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/orders/orders.service.ts'),'utf8');

  it('claims cancellation atomically before returning stock',()=>{
    expect(source).toContain("tx.order.updateMany({where:{id,tenantId,status:{not:'canceled'}}");
    expect(source).toContain("if(claimed.count!==1)");
    expect(source).toContain("Pedido já foi cancelado por outra operação");
  });
});
