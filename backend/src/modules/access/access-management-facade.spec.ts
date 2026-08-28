import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ApiService access-management facade compatibility',()=>{
  it('keeps platform tenant invitation helpers used outside the extracted access domain',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/api.service.ts'),'utf8');
    expect(source).toContain('private invitationHash(token:string)');
    expect(source).toContain('private invitationUrl(token:string)');
    expect(source).toContain('this.invitationHash(token)');
    expect(source).toContain('this.invitationUrl(token)');
  });
});
