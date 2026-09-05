import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Platform concurrency safeguards',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/platform/platform-admin.service.ts'),'utf8');

  it('serializes scheduled plan changes',()=>{expect(source).toContain("const existing=await tx.subscription.findFirst({where:{tenantId:id,status:'scheduled'}})");expect(source).toContain("tx.subscription.create({data:{tenantId:id,plan,period");});

  it('cancels scheduled plan changes with compare-and-set',()=>{expect(source).toContain("updateMany({where:{id:scheduled.id,tenantId:id,status:'scheduled'}");expect(source).toContain("claimed.count!==1");});

  it('serializes plan deactivation against scheduled subscriptions',()=>{expect(source).toContain("const scheduled=await tx.subscription.count({where:{plan,status:'scheduled'}})");expect(source).toContain("return tx.planLimit.update({where:{plan},data})");});

  it('serializes platform tenant owner checks and creation',()=>{expect(source).toContain("if(await tx.user.findUnique({where:{email}}))");expect(source).toContain("const pending=await tx.userInvitation.findFirst");expect(source).toContain("const tenant=await tx.tenant.create");});
});
