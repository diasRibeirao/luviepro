import type {Request} from 'express';
export type TenantRole='owner'|'admin'|'commercial'|'operational'|'finance';
export interface TenantPrincipal{sub:string;tenantId:string;role:TenantRole;plan?:'starter'|'pro'|'business';customProfileId?:string|null;permissions?:string[];typ?:'access';sid?:string;}
export interface PlatformPrincipal{sub:string;role:'platform_admin';platformAdmin:true;typ?:'access';sid?:string;}
export type TenantRequest=Request&{user:TenantPrincipal;requestId?:string};export type PlatformRequest=Request&{user:PlatformPrincipal;requestId?:string};
