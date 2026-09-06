import {billingAction,isBillingPeriod,isPlanCode,periodEnd,periodPrice,planRank,subscriptionStatus} from './plan-policy';

describe('plan policy',()=>{
  it.each([['basic',1],['starter',2],['pro',3],['business',4],['other',0]])('rank %s', (plan,rank)=>expect(planRank(plan)).toBe(rank));
  it('recognizes valid plans',()=>{expect(isPlanCode('starter')).toBe(true);expect(isPlanCode('enterprise')).toBe(true);});
  it('recognizes valid periods',()=>{expect(isBillingPeriod('annual')).toBe(true);expect(isBillingPeriod('weekly')).toBe(false);});
  const prices={monthlyPriceCents:1000,quarterlyPriceCents:2700,semiannualPriceCents:5100,annualPriceCents:9600};
  it.each([['monthly',1000],['quarterly',2700],['semiannual',5100],['annual',9600]])('price %s',(period,expected)=>expect(periodPrice(prices,period)).toBe(expected));
  it('computes monthly period end without mutating source',()=>{const start=new Date(2026,0,15,12);const end=periodEnd(start,'monthly');expect(start.getMonth()).toBe(0);expect(end.getMonth()).toBe(1);expect(end.getDate()).toBe(15);});
  it('clamps month end instead of skipping a month',()=>{const end=periodEnd(new Date(2026,0,31,12),'monthly');expect(end.getMonth()).toBe(1);expect(end.getDate()).toBe(28);});
  it('clamps leap day on annual renewal',()=>{const end=periodEnd(new Date(2028,1,29,12),'annual');expect(end.getFullYear()).toBe(2029);expect(end.getMonth()).toBe(1);expect(end.getDate()).toBe(28);});
  it('classifies new subscription when current period expired',()=>expect(billingAction('pro','business',new Date('2025-01-01'),new Date('2026-01-01'))).toBe('new_subscription'));
  it('classifies renewal',()=>expect(billingAction('pro','pro',new Date('2027-01-01'),new Date('2026-01-01'))).toBe('renewal'));
  it('classifies upgrade',()=>expect(billingAction('pro','business',new Date('2027-01-01'),new Date('2026-01-01'))).toBe('upgrade'));
  it('classifies downgrade',()=>expect(billingAction('business','starter',new Date('2027-01-01'),new Date('2026-01-01'))).toBe('downgrade'));
  it('uses catalog sort order for dynamic plans',()=>{const expires=new Date('2027-01-01'),now=new Date('2026-01-01');expect(billingAction('pro','enterprise',expires,now,20,40)).toBe('upgrade');expect(billingAction('enterprise','pro',expires,now,40,20)).toBe('downgrade');});
  it('normalizes unknown subscription status',()=>{expect(subscriptionStatus('active')).toBe('active');expect(subscriptionStatus('weird')).toBe('unknown');});
});
