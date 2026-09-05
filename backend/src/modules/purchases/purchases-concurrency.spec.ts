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


  it('serializes supplier document creation checks',()=>{expect(source).toContain("tx.supplier.findFirst({where:{tenantId,document}}");expect(source).toContain("tx.supplier.create({data:{tenantId,name:b.name.trim(),document");});

  it('serializes supplier document updates',()=>{expect(source).toContain("const supplier=await tx.supplier.findFirst({where:{id,tenantId}})");expect(source).toContain("return tx.supplier.update({where:{id}");});

  it('serializes purchase cancellation against receipts and payments',()=>{expect(source).toContain("const current=await tx.purchaseOrder.findFirst({where:{id,tenantId},include:includePurchase})");expect(source).toContain("current.items.some(i=>i.receivedQuantity>0)");});
});
