import type { BillingAction,BillingPeriod,PlanCode } from '../../../plan-policy';
export interface MercadoPagoPreferenceResponse {id?:string|number;init_point?:string;sandbox_init_point?:string;message?:string;}
export interface MercadoPagoPayer {email?:string|null;}
export interface MercadoPagoPayment {id:string|number;status?:string;status_detail?:string|null;payment_type_id?:string|null;payment_method_id?:string|null;currency_id?:string|null;transaction_amount?:number;external_reference?:string|null;payer?:MercadoPagoPayer;metadata?:Record<string,unknown>;date_approved?:string|null;}
export interface MercadoPagoSearchResponse {results?:MercadoPagoPayment[];}
export interface CheckoutPreferenceBody {items:Array<{id:string;title:string;description:string;currency_id:'BRL';quantity:1;unit_price:number}>;payer:{email:string};external_reference:string;metadata:{payment_id:string;tenant_id:string;plan:PlanCode;period:BillingPeriod;billing_action:BillingAction};statement_descriptor:'LUVIEPRO';back_urls?:{success:string;pending:string;failure:string};auto_return?:'approved';notification_url?:string;}
export async function jsonObject<T extends object>(response:Response):Promise<Partial<T>>{const value:unknown=await response.json().catch(()=>({}));return value&&typeof value==='object'&&!Array.isArray(value)?value as Partial<T>:{};}
