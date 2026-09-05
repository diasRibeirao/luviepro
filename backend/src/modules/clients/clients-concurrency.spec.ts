import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Client capacity concurrency',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/clients/clients.service.ts'),'utf8');

  it('serializes client creation capacity checks',()=>{
    expect(source).toContain("tx.client.count({where:{tenantId,active:true}})");
    expect(source).toContain("{isolationLevel:'Serializable'}");
    expect(source).toContain("code?:string})?.code==='P2034'");
  });

  it('serializes client reactivation with capacity recheck',()=>{
    expect(source).toContain("const client=await tx.client.findFirst({where:{id,tenantId}})");
    expect(source).toContain("return tx.client.update({where:{id},data:this.normalize(data,client)})");
  });
});
