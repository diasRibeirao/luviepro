import {envInt} from '../config/env';
export interface RetentionPolicy{auditDays:number;webhookDays:number;paymentDays:number;authSessionDays:number}
export function retentionPolicy(env:NodeJS.ProcessEnv=process.env):RetentionPolicy{return {auditDays:envInt(env,'AUDIT_RETENTION_DAYS',365,{min:30,max:3650}),webhookDays:envInt(env,'WEBHOOK_RETENTION_DAYS',90,{min:7,max:3650}),paymentDays:envInt(env,'PAYMENT_RETENTION_DAYS',1825,{min:365,max:3650}),authSessionDays:envInt(env,'AUTH_SESSION_RETENTION_DAYS',30,{min:1,max:365})};}
export function retentionCutoff(days:number,now=new Date()){return new Date(now.getTime()-days*86400000);}
