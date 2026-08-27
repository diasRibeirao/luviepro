export interface PlanLimitLike {
  maxClients:number;
  maxQuotesPerMonth:number;
  maxUsers:number;
  customPdf?:boolean|null;
  logoPdf?:boolean|null;
  premiumTemplates?:boolean|null;
  projectManagement?:string|null;
  advancedReports?:boolean|null;
  exportData?:boolean|null;
  standardRoles?:boolean|null;
  customRoles?:boolean|null;
  granularPermissions?:boolean|null;
  auditAccess?:boolean|null;
}

export type EntitlementKey='customPdf'|'logoPdf'|'premiumTemplates'|'advancedReports'|'exportData'|'standardRoles'|'customRoles'|'granularPermissions'|'auditAccess';
export interface UsageSnapshot {clients:number;quotes:number;users:number;pendingInvitations:number;}
export interface EntitlementSnapshot {
  limits:{clients:number|null;quotesPerMonth:number|null;users:number|null};
  usage:UsageSnapshot&{userSeatsUsed:number};
  features:Record<EntitlementKey,boolean>&{projectManagement:string};
  remaining:{clients:number|null;quotesPerMonth:number|null;users:number|null};
}
const normalized=(value:number)=>value<0?null:value;
const remaining=(limit:number|null,used:number)=>limit==null?null:Math.max(0,limit-used);
export function entitlementSnapshot(limit:PlanLimitLike|undefined|null,usage:UsageSnapshot):EntitlementSnapshot{
  const limits={clients:normalized(limit?.maxClients??-1),quotesPerMonth:normalized(limit?.maxQuotesPerMonth??-1),users:normalized(limit?.maxUsers??-1)};
  const userSeatsUsed=usage.users+usage.pendingInvitations;
  return {
    limits,
    usage:{...usage,userSeatsUsed},
    features:{customPdf:!!limit?.customPdf,logoPdf:limit?.logoPdf!==false,premiumTemplates:!!limit?.premiumTemplates,advancedReports:!!limit?.advancedReports,exportData:!!limit?.exportData,standardRoles:!!limit?.standardRoles,customRoles:!!limit?.customRoles,granularPermissions:!!limit?.granularPermissions,auditAccess:!!limit?.auditAccess,projectManagement:limit?.projectManagement??'basic'},
    remaining:{clients:remaining(limits.clients,usage.clients),quotesPerMonth:remaining(limits.quotesPerMonth,usage.quotes),users:remaining(limits.users,userSeatsUsed)}
  };
}
export function capacityReached(limit:number|null,used:number){return limit!=null&&used>=limit;}
