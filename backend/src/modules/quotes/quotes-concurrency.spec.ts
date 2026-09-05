import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Quote concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/quotes/quotes.service.ts'),'utf8');
it('claims decision and reservation atomically',()=>{expect(s).toContain("clientDecision:null");expect(s).toContain("reservedQuantity:p.reservedQuantity");});});
