import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantActiveGuard } from './tenant-active.guard';
import { ALLOW_PAYMENT_REVIEW_KEY } from './payment-review.decorator';
import { ALLOW_BILLING_RESTRICTED_KEY } from './billing-restricted.decorator';

const context=(user:any)=>({getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({user})})}) as any;
const reflector={getAllAndOverride:()=>false} as unknown as Reflector;

describe('TenantActiveGuard',()=>{
  it('bloqueia assinatura expirada',async()=>{
    const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()-1000)})},user:{findFirst:jest.fn().mockResolvedValue({active:true})}};
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia usuário desativado mesmo com access token ainda válido',async()=>{
    const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()+10000)})},user:{findFirst:jest.fn().mockResolvedValue({active:false})}};
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia tenant em payment_review fora do billing',async()=>{
    const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'payment_review',subscriptionExpiresAt:new Date(Date.now()+10000)})},user:{findFirst:jest.fn().mockResolvedValue({active:true})}};
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite payment_review quando endpoint declara exceção',async()=>{
    const reviewReflector={getAllAndOverride:jest.fn((key:string)=>key===ALLOW_PAYMENT_REVIEW_KEY)} as unknown as Reflector;
    const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'payment_review',subscriptionExpiresAt:new Date(Date.now()+10000)})},user:{findFirst:jest.fn().mockResolvedValue({active:true})}};
    await expect(new TenantActiveGuard(db,reviewReflector).canActivate(context({tenantId:'t1',sub:'u1'}))).resolves.toBe(true);
  });

  it('permite assinatura expirada somente em endpoint de billing restrito',async()=>{
    const billingReflector={getAllAndOverride:jest.fn((key:string)=>key===ALLOW_BILLING_RESTRICTED_KEY)} as unknown as Reflector;
    const db:any={tenant:{findUnique:jest.fn().mockResolvedValue({status:'expired',subscriptionExpiresAt:new Date(Date.now()-1000)})},user:{findFirst:jest.fn().mockResolvedValue({active:true})}};
    await expect(new TenantActiveGuard(db,billingReflector).canActivate(context({tenantId:'t1',sub:'u1'}))).resolves.toBe(true);
  });
});
