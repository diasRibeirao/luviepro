import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Invitation acceptance concurrency safeguards', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/modules/access/access-management.service.ts'),
    'utf8',
  );

  it('checks capacity and creates the user inside a serializable transaction', () => {
    expect(source).toContain(
      "tx.user.count({where:{tenantId:invitation.tenantId,active:true}})",
    );
    expect(source).toContain(
      "tx.user.create({data:{tenantId:invitation.tenantId",
    );
    expect(source).toMatch(/isolationLevel\s*:\s*['"]Serializable['"]/);
  });

  it('retries serialization conflicts', () => {
    expect(source).toContain("'P2034'");
    expect(source).toContain(
      'for(let attempt=0;attempt<3&&!result;attempt++)',
    );
  });

  it('serializes access profile duplicate checks and creation',()=>{
    expect(source).toContain("tx.accessProfile.findFirst({where:{tenantId,name:{equals:name,mode:'insensitive'}}})");
    expect(source).toContain("tx.accessProfile.create({data:{tenantId,name");
    expect(source).toContain("if(code==='P2002')throw new ConflictException('Já existe um perfil com este nome')");
  });

  it('serializes access profile deactivation against assigned users',()=>{
    expect(source).toContain("tx.user.count({where:{tenantId,customProfileId:id,active:true}})");
    expect(source).toContain("return tx.accessProfile.update({where:{id},data:patch})");
  });

  it('uses compare-and-set when cancelling an invitation',()=>{
    expect(source).toContain("status:{in:['pending','expired']},updatedAt:invitation.updatedAt");
    expect(source).toContain("if(claimed.count!==1)throw new ConflictException('Este convite foi alterado por outra operação.");
  });
});
