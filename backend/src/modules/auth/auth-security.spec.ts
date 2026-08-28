import {AUTH_SECURITY,accountLockedUntil,assertPasswordPolicy,normalizeEmail,passwordResetExpiresAt,refreshTokenExpiresAt} from './auth-security';
describe('auth security policy',()=>{
 it('normalizes email',()=>expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com'));
 it('enforces minimum password length',()=>{expect(()=>assertPasswordPolicy('1234567')).toThrow('pelo menos 8');expect(()=>assertPasswordPolicy('12345678')).not.toThrow();});
 it('uses configured reset window',()=>{const n=new Date('2026-08-27T12:00:00Z');expect(passwordResetExpiresAt(n).getTime()-n.getTime()).toBe(AUTH_SECURITY.passwordResetMinutes*60_000);});
 it('uses configured refresh-token window',()=>{const n=new Date('2026-08-27T12:00:00Z');expect(refreshTokenExpiresAt(n).getTime()-n.getTime()).toBe(AUTH_SECURITY.refreshTokenDays*24*60*60_000);});
 it('uses configured lock window',()=>{const n=new Date('2026-08-27T12:00:00Z');expect(accountLockedUntil(n).getTime()-n.getTime()).toBe(AUTH_SECURITY.lockMinutes*60_000);});
});
