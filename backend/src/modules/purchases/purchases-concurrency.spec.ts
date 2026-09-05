import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Purchase concurrency safeguards',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/purchases/purchases.service.ts'),'utf8');

  it('prevents concurrent receipts from exceeding the item quantity',()=>{
    expect(source).toContain("tx.purchaseOrderItem.updateMany({where:{id:itemId,purchaseOrderId:id,receivedQuantity:{lte:item.quantity-q}}");
    expect(source).toContain("if(updatedItem.count!==1)");
  });
  it('serializes stock cost updates and retries write conflicts',()=>{
    expect(source).toContain("{isolationLevel:'Serializable'}");
    expect(source).toContain("code?:string})?.code==='P2034'");
    expect(source).toContain("attempt<3");
    expect(source).toContain("const before=await tx.product.findUniqueOrThrow");
    expect(source).toContain("costCents:weightedCost");
  });

});
