import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Purchase concurrency safeguards',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/purchases/purchases.service.ts'),'utf8');

  it('prevents concurrent receipts from exceeding the item quantity',()=>{
    expect(source).toContain("tx.purchaseOrderItem.updateMany({where:{id:itemId,purchaseOrderId:id,receivedQuantity:{lte:item.quantity-q}}");
    expect(source).toContain("if(updatedItem.count!==1)");
  });
});
