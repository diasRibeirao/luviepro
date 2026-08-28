import {isQuoteStatus,QUOTE_TRANSITIONS} from './quote.types';
describe('quote types',()=>{it('validates status and transition map',()=>{expect(isQuoteStatus('sent')).toBe(true);expect(isQuoteStatus('x')).toBe(false);expect(QUOTE_TRANSITIONS.draft).toContain('sent');});});
