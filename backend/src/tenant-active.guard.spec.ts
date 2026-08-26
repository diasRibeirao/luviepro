import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantActiveGuard } from './tenant-active.guard';
const context=(user:any)=>({getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({user})})}) as any;
const reflector={getAllAndOverride:()=>false} as unknown as Reflector;
describe('TenantActiveGuard',()=>{
  it('bloqueia assinatura expirada',async()=>{const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()-1000)})},user:{findFirst:jest.fn().mockResolvedValue({active:true})}};await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(ForbiddenException);});
  it('bloqueia usuário desativado mesmo com access token ainda válido',async()=>{const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()+10000)})},user:{findFirst:jest.fn().mockResolvedValue({active:false})}};await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(ForbiddenException);});
});
