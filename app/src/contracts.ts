export type PlanCode='starter'|'pro'|'business';
export type BillingPeriod='monthly'|'quarterly'|'semiannual'|'annual';
export type BillingAction='new_subscription'|'renewal'|'upgrade'|'downgrade';
export type PaymentStatus='pending'|'approved'|'rejected'|'cancelled'|'refunded'|'charged_back'|'error';

export interface PlanLimit {
  plan:PlanCode;
  maxClients:number;
  maxQuotesPerMonth:number;
  maxUsers:number;
  customPdf:boolean;
  logoPdf:boolean;
  premiumTemplates:boolean;
  projectManagement:string;
  advancedReports:boolean;
  exportData:boolean;
  standardRoles:boolean;
  customRoles:boolean;
  granularPermissions:boolean;
  auditAccess:boolean;
  monthlyPriceCents:number;
  quarterlyPriceCents:number;
  semiannualPriceCents:number;
  annualPriceCents:number;
}
export interface AccountUser {id:string;name:string;email:string;role:string;customProfileId?:string|null;customProfile?:{id:string;name:string}|null;active:boolean;lastLoginAt?:string|null;lockedUntil?:string|null;passwordChangedAt?:string|null;}
export interface AccountResponse {
  tenant:{id:string;name:string;plan:PlanCode;planPeriod:BillingPeriod;subscriptionExpiresAt?:string|null;status:string;responsibleName?:string|null;contactEmail?:string|null;phone?:string|null};
  limit:PlanLimit|null;
  currentUser:AccountUser|null;
  usage:{clients:number;quotes:number;users:number;pendingInvitations:number;userSeatsUsed:number};
  features:{customPdf:boolean;logoPdf:boolean;premiumTemplates:boolean;projectManagement:string;advancedReports:boolean;exportData:boolean;standardRoles:boolean;customRoles:boolean;granularPermissions:boolean;auditAccess:boolean};
  entitlements?:{
    limits:{clients:number|null;quotesPerMonth:number|null;users:number|null};
    usage:{clients:number;quotes:number;users:number;pendingInvitations:number;userSeatsUsed:number};
    features:AccountResponse['features'];
    remaining:{clients:number|null;quotesPerMonth:number|null;users:number|null};
  };
}
export interface BillingPayment {
  id:string;provider:string;providerPaymentId?:string|null;providerPreferenceId?:string|null;plan:PlanCode;period:BillingPeriod;amountCents:number;status:PaymentStatus;billingAction:BillingAction;checkoutUrl?:string|null;paymentMethod?:string|null;providerStatus?:string|null;providerStatusDetail?:string|null;currency:string;payerEmail?:string|null;paidAt?:string|null;cancelledAt?:string|null;refundedAt?:string|null;chargebackAt?:string|null;createdAt:string;updatedAt:string;subscription?:{id:string;status:string;startsAt:string;expiresAt:string}|null;
}
export interface CheckoutResponse {paymentId:string;preferenceId?:string|null;checkoutUrl:string;webhookConfigured:boolean;sandbox:boolean;billingAction:BillingAction;effectiveAt?:string;reused?:boolean;}
export interface ReconcileResponse {ok?:boolean;status:PaymentStatus;paymentId:string;ignored?:boolean;}
export function isPlanCode(value:string):value is PlanCode{return value==='starter'||value==='pro'||value==='business';}
export function planRank(value:string){return ({starter:1,pro:2,business:3} as Record<string,number>)[value]??0;}
