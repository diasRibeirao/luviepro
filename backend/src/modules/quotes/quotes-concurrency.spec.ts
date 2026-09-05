import { readFileSync } from 'fs'; import { resolve } from 'path';
describe('Quote concurrency',()=>{const s=readFileSync(resolve(process.cwd(),'src/modules/quotes/quotes.service.ts'),'utf8');
it('claims decision and reservation atomically',()=>{expect(s).toContain("clientDecision:null");expect(s).toContain("reservedQuantity:p.reservedQuantity");});
it('serializes quote capacity and sequence allocation',()=>{expect(s).toContain("const used=await tx.quote.count");expect(s).toContain("const seq=await tx.quoteSequence.upsert");expect(s).toContain("{isolationLevel:'Serializable'}");});

it('claims quote status transitions with compare-and-set',()=>{expect(s).toContain("status:quote.status,clientDecision:null");expect(s).toContain("if(claimed.count!==1)throw new ConflictException('O orçamento foi alterado");});
});
