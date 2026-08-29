export type PlanCode=string;
export const BILLING_PERIODS=['monthly','quarterly','semiannual','annual'] as const;
export type BillingPeriod=typeof BILLING_PERIODS[number];
export type BillingAction='new_subscription'|'renewal'|'upgrade'|'downgrade';

export interface PlanPriceSource {
  monthlyPriceCents:number;
  quarterlyPriceCents:number;
  semiannualPriceCents:number;
  annualPriceCents:number;
}

export function isPlanCode(value:string):value is PlanCode{return /^[a-z][a-z0-9-]{1,30}$/.test(value);}
export function isBillingPeriod(value:string):value is BillingPeriod{return (BILLING_PERIODS as readonly string[]).includes(value);}
export function planRank(plan:string){return ({starter:1,pro:2,business:3} as Record<string,number>)[plan]??0;}
export function periodPrice(limit:PlanPriceSource,period:string){
  if(period==='annual')return limit.annualPriceCents;
  if(period==='semiannual')return limit.semiannualPriceCents;
  if(period==='quarterly')return limit.quarterlyPriceCents;
  return limit.monthlyPriceCents;
}
function addMonthsClamped(start:Date,months:number){
  const end=new Date(start);const day=end.getDate();
  end.setDate(1);end.setMonth(end.getMonth()+months);
  const lastDay=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();
  end.setDate(Math.min(day,lastDay));return end;
}
export function periodEnd(start:Date,period:string){
  return addMonthsClamped(start,period==='annual'?12:period==='semiannual'?6:period==='quarterly'?3:1);
}
export function billingAction(
  currentPlan:string,
  targetPlan:string,
  expiresAt?:Date|null,
  now=new Date(),
  currentSortOrder?:number|null,
  targetSortOrder?:number|null,
):BillingAction{
  if(!expiresAt||expiresAt.getTime()<=now.getTime())return 'new_subscription';
  if(currentPlan===targetPlan)return 'renewal';
  if(typeof currentSortOrder==='number'&&typeof targetSortOrder==='number'){
    return targetSortOrder>currentSortOrder?'upgrade':'downgrade';
  }
  return planRank(targetPlan)>planRank(currentPlan)?'upgrade':'downgrade';
}
export type SubscriptionStatus='trial'|'active'|'scheduled'|'past_due'|'payment_review'|'cancelled'|'expired'|'replaced'|'unknown';
export function subscriptionStatus(status?:string|null):SubscriptionStatus{
  switch(status){case 'trial':case 'active':case 'scheduled':case 'past_due':case 'payment_review':case 'cancelled':case 'expired':case 'replaced':return status;default:return 'unknown';}
}
