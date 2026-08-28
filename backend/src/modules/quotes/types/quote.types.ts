import type { JsonValue } from '../../../domain/json-value';
export type QuoteStatus='draft'|'sent'|'approved'|'rejected';
export type QuoteDecision='approved'|'rejected';
export interface QuoteTimelineEvent { type:'created'|'version'|'status'|'share'|'approved'|'rejected'|'duplicate'; title:string; at:Date|string; detail?:string; }
export interface QuoteSnapshotItem {serviceName:string;days:number;people:number;laborCents:number;variableCents:number;fixedCents:number;marginCents:number;totalCents:number;configurationJson?:JsonValue|null;stages:unknown[];}
export interface QuoteSnapshot {clientId:string;number:string;status:string;totalCents:number;discountBps:number;finalTotalCents:number;validityDays:number;notes:string|null;sentAt:Date|null;approvedAt:Date|null;validUntil:Date|null;items:QuoteSnapshotItem[];}
export interface BuiltQuoteItem {tenantId:string;serviceName:string;days:number;people:number;laborCents:number;variableCents:number;fixedCents:number;marginCents:number;totalCents:number;configurationJson:Record<string,string|number>;stages:{create:Array<{tenantId:string;sequence:number;description:string;duration:string|null}>};}
export const QUOTE_TRANSITIONS:Record<Exclude<QuoteStatus,'approved'>,readonly QuoteStatus[]>={draft:['sent'],sent:['draft','rejected'],rejected:['draft']};
export function isQuoteStatus(value:string):value is QuoteStatus{return ['draft','sent','approved','rejected'].includes(value);}
