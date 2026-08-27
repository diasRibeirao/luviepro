import {capacityReached,entitlementSnapshot} from './entitlements';
describe('entitlements',()=>{
  const usage={clients:20,quotes:5,users:2,pendingInvitations:1};
  it('normalizes unlimited values to null',()=>{const x=entitlementSnapshot({maxClients:-1,maxQuotesPerMonth:-1,maxUsers:10},usage);expect(x.limits.clients).toBeNull();expect(x.remaining.clients).toBeNull();});
  it('counts invitations as user seats',()=>{const x=entitlementSnapshot({maxClients:30,maxQuotesPerMonth:10,maxUsers:3},usage);expect(x.usage.userSeatsUsed).toBe(3);expect(x.remaining.users).toBe(0);});
  it('maps features',()=>{const x=entitlementSnapshot({maxClients:30,maxQuotesPerMonth:10,maxUsers:3,customRoles:true,auditAccess:true},usage);expect(x.features.customRoles).toBe(true);expect(x.features.auditAccess).toBe(true);expect(x.features.logoPdf).toBe(true);});
  it('detects exhausted capacity',()=>{expect(capacityReached(3,3)).toBe(true);expect(capacityReached(null,999)).toBe(false);});
});
