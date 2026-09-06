import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Finance state concurrency safeguards',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/finance/finance.service.ts'),'utf8');

  it('pays only while the entry is still pending',()=>{
    expect(source).toContain("tx.financialEntry.updateMany({where:{id,tenantId,status:'pending'},data:{status:'paid'");
    expect(source).toContain("Lançamento cancelado não pode ser pago");
  });

  it('cancels only while the entry is still pending',()=>{
    expect(source).toContain("tx.financialEntry.updateMany({where:{id,tenantId,status:'pending'},data:{status:'canceled'}}");
    expect(source).toContain("Lançamento já realizado não pode ser cancelado");
  });
  it('serializes financial category sortOrder allocation',()=>{
    expect(source).toContain("tx.financialCategory.aggregate({where:{tenantId,type:b.type},_max:{sortOrder:true}})");
    expect(source).toContain("tx.financialCategory.create({data:{tenantId,name,type:b.type,sortOrder:(max._max.sortOrder??0)+10}})");
  });

  it('serializes payment method sortOrder allocation',()=>{
    expect(source).toContain("tx.financialPaymentMethod.aggregate({where:{tenantId},_max:{sortOrder:true}})");
    expect(source).toContain("tx.financialPaymentMethod.create({data:{tenantId,code:base,name,sortOrder:(max._max.sortOrder??0)+10}})");
  });

  it('retries finance catalog writes after P2034',()=>{
    expect((source.match(/isolationLevel:'Serializable'/g)||[]).length).toBeGreaterThanOrEqual(2);
    expect((source.match(/code\?:string\}\)\?\.code==='P2034'/g)||[]).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps at least one active payment method inside a serializable transaction',()=>{
    expect(source).toContain("const current=await tx.financialPaymentMethod.findFirst({where:{id,tenantId}})");
    expect(source).toContain("const activeCount=await tx.financialPaymentMethod.count({where:{tenantId,active:true}})");
    expect(source).toContain("return tx.financialPaymentMethod.update({where:{id},data:{name,active:b.active??current.active}})");
    expect(source).toContain("Mantenha ao menos uma forma de pagamento ativa");
  });

  it('retries payment method deactivation after P2034',()=>{
    const method=source.slice(source.indexOf("async updatePaymentMethod"),source.indexOf("private async validatePaymentMethod"));
    expect(method).toContain("{isolationLevel:'Serializable'}");
    expect(method).toContain("code?:string})?.code==='P2034'");
    expect(method).toContain("attempt<3");
  });

});
