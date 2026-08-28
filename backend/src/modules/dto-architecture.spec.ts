import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('feature DTO architecture',()=>{
  const domains=['auth','access','billing','quotes','projects','calendar','notifications','clients','services','platform','account','audit'];
  it.each(domains)('keeps %s DTOs inside the owning feature',domain=>{
    expect(existsSync(resolve(process.cwd(),`src/modules/${domain}/dto/${domain}.dto.ts`))).toBe(true);
  });
  it('keeps the legacy dto barrel definitions-free',()=>{
    const source=readFileSync(resolve(process.cwd(),'src/dtos.ts'),'utf8');
    expect(source).not.toMatch(/export class\s/);
    expect(source).toContain("export * from './modules/quotes/dto/quotes.dto';");
  });
  it('feature controllers import their own DTOs directly',()=>{
    const access=readFileSync(resolve(process.cwd(),'src/modules/access/access.controller.ts'),'utf8');
    const quotes=readFileSync(resolve(process.cwd(),'src/modules/quotes/quotes.controller.ts'),'utf8');
    expect(access).not.toContain("from '../../dtos'");
    expect(quotes).not.toContain("from '../../dtos'");
    expect(access).toContain("from './dto/access.dto'");
    expect(quotes).toContain("from './dto/quotes.dto'");
  });
});
