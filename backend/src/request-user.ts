import type {Request} from 'express';
export interface TenantPrincipal {sub:string;tenantId:string;role:string;plan?:string;customProfileId?:string|null;permissions?:string[];typ?:string;sid?:string;}
export interface PlatformPrincipal {sub:string;role:'platform_admin';platformAdmin:true;typ?:string;sid?:string;}
export type TenantRequest=Request&{user:TenantPrincipal;requestId?:string};
export type PlatformRequest=Request&{user:PlatformPrincipal;requestId?:string};
