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
});
