import type { BillingPeriod,PlanCode } from '../../../plan-policy';
export interface RegisterInput {name:string;company:string;email:string;password:string;phone?:string;plan?:PlanCode|string;period?:BillingPeriod|string;}
export interface ForgotPasswordResponse {ok:true;message:string;devResetUrl?:string;}
