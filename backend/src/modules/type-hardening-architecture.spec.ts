import { readFileSync } from 'fs';
import { resolve } from 'path';
const read=(file:string)=>readFileSync(resolve(process.cwd(),'src',file),'utf8');
describe('Rounds 90-109 type hardening architecture',()=>{
  it('keeps client/calendar/projects audit metadata JSON-safe',()=>{
    for(const file of ['modules/clients/clients.service.ts','modules/calendar/calendar.service.ts','modules/projects/projects.service.ts','modules/account/account.service.ts']) expect(read(file)).toContain('auditMetadata(');
  });
  it('keeps mail transport free of explicit any',()=>expect(read('mail.service.ts')).not.toMatch(/\bany\b/));
  it('uses shared HTML escaping in mail',()=>expect(read('mail.service.ts')).toContain("from './security/html'"));
});
