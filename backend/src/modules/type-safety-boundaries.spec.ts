import {readFileSync} from 'fs';
import {join} from 'path';
const read=(file:string)=>readFileSync(join(__dirname,'..',file),'utf8');
describe('type-safety production boundaries',()=>{
  it('keeps auth/audit production services free of explicit any',()=>{for(const file of ['modules/auth/auth.service.ts','modules/audit/audit.service.ts','modules/billing/subscription.service.ts'])expect(read(file)).not.toMatch(/\bany\b/);});
  it('uses typed Mercado Pago contracts',()=>{const source=read('modules/billing/billing.service.ts');expect(source).toContain('MercadoPagoPayment');expect(source).toContain('CheckoutPreferenceBody');expect(source).toContain('jsonObject<MercadoPagoPreferenceResponse>');});
  it('uses quote transition contracts',()=>{const source=read('modules/quotes/quotes.service.ts');expect(source).toContain('QUOTE_TRANSITIONS');expect(source).toContain('QuoteTimelineEvent[]');});
});
