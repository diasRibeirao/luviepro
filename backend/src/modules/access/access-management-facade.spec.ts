import { readFileSync } from 'fs';
import { resolve } from 'path';

const read=(file:string)=>readFileSync(resolve(process.cwd(),'src',file),'utf8');

describe('ApiService access-management facade compatibility',()=>{
  it('delegates platform tenant creation after invitation helpers move to PlatformAdminService',()=>{
    const api=read('api.service.ts');
    const platform=read('modules/platform/platform-admin.service.ts');

    expect(api).not.toContain('private invitationHash(token:string)');
    expect(api).not.toContain('private invitationUrl(token:string)');
    expect(api).toContain('platformCreateTenant(data:PlatformCreateTenantDto,platformAdminId:string){return this.platformService().createTenant(data,platformAdminId);}');

    expect(platform).toContain('private invitationHash(token:string)');
    expect(platform).toContain('private invitationUrl(token:string)');
    expect(platform).toContain('tokenHash:this.invitationHash(token)');
    expect(platform).toContain('const inviteUrl=this.invitationUrl(token)');
  });
});
