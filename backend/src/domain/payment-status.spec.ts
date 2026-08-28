import {isTerminalPaymentStatus,normalizePaymentStatus} from './payment-status';
describe('payment status',()=>{it('normalizes provider statuses',()=>{expect(normalizePaymentStatus('in_process')).toBe('pending');expect(normalizePaymentStatus('approved')).toBe('approved');expect(normalizePaymentStatus('unknown')).toBe('pending');expect(isTerminalPaymentStatus('refunded')).toBe(true);});});
