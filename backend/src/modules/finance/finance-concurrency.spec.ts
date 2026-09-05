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
});
