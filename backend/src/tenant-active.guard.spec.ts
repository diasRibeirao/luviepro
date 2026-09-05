import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantActiveGuard } from './tenant-active.guard';
import { ALLOW_PAYMENT_REVIEW_KEY } from './payment-review.decorator';
import { ALLOW_BILLING_RESTRICTED_KEY } from './billing-restricted.decorator';

const context=(user:any)=>({getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({user})})}) as any;
const reflector={getAllAndOverride:()=>false} as unknown as Reflector;

function tenantDb(overrides:any={}){
  return {
    authSession:{findFirst:jest.fn().mockResolvedValue({id:'s1'})},
    tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()+10000)})},
    user:{findFirst:jest.fn().mockResolvedValue({active:true})},
    platformAdmin:{findFirst:jest.fn()},
    ...overrides,
  } as any;
}

describe('TenantActiveGuard',()=>{
  it('bloqueia assinatura expirada',async()=>{
    const db=tenantDb({tenant:{findUnique:jest.fn().mockResolvedValue({status:'active',subscriptionExpiresAt:new Date(Date.now()-1000)})}});
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia usuário desativado mesmo com access token ainda válido',async()=>{
    const db=tenantDb({user:{findFirst:jest.fn().mockResolvedValue({active:false})}});
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia access token quando a sessão foi revogada por logout',async()=>{
    const db=tenantDb({authSession:{findFirst:jest.fn().mockResolvedValue(null)}});
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.authSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({id:'s1',userId:'u1',tenantId:'t1',revokedAt:null}),
    }));
  });

  it('bloqueia token sem identificador de sessão',async()=>{
    const db=tenantDb();
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1'}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bloqueia tenant em payment_review fora do billing',async()=>{
    const db=tenantDb({tenant:{findUnique:jest.fn().mockResolvedValue({status:'payment_review',subscriptionExpiresAt:new Date(Date.now()+10000)})}});
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite payment_review quando endpoint declara exceção',async()=>{
    const reviewReflector={getAllAndOverride:jest.fn((key:string)=>key===ALLOW_PAYMENT_REVIEW_KEY)} as unknown as Reflector;
    const db=tenantDb({tenant:{findUnique:jest.fn().mockResolvedValue({status:'payment_review',subscriptionExpiresAt:new Date(Date.now()+10000)})}});
    await expect(new TenantActiveGuard(db,reviewReflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).resolves.toBe(true);
  });

  it('permite assinatura expirada somente em endpoint de billing restrito',async()=>{
    const billingReflector={getAllAndOverride:jest.fn((key:string)=>key===ALLOW_BILLING_RESTRICTED_KEY)} as unknown as Reflector;
    const db=tenantDb({tenant:{findUnique:jest.fn().mockResolvedValue({status:'expired',subscriptionExpiresAt:new Date(Date.now()-1000)})}});
    await expect(new TenantActiveGuard(db,billingReflector).canActivate(context({tenantId:'t1',sub:'u1',sid:'s1'}))).resolves.toBe(true);
  });

  it('valida sessão e usuário Master a cada requisição protegida',async()=>{
    const db:any={
      authSession:{findFirst:jest.fn().mockResolvedValue({id:'ps1'})},
      platformAdmin:{findFirst:jest.fn().mockResolvedValue({id:'pa1'})},
      tenant:{findUnique:jest.fn()},
      user:{findFirst:jest.fn()},
    };
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({sub:'pa1',sid:'ps1',role:'platform_admin',platformAdmin:true}))).resolves.toBe(true);
    expect(db.authSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({id:'ps1',platformAdminId:'pa1',revokedAt:null}),
    }));
  });

  it('bloqueia access token de Master após logout ou revogação',async()=>{
    const db:any={
      authSession:{findFirst:jest.fn().mockResolvedValue(null)},
      platformAdmin:{findFirst:jest.fn().mockResolvedValue({id:'pa1'})},
      tenant:{findUnique:jest.fn()},
      user:{findFirst:jest.fn()},
    };
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({sub:'pa1',sid:'ps1',role:'platform_admin',platformAdmin:true}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bloqueia usuário Master inativo imediatamente',async()=>{
    const db:any={
      authSession:{findFirst:jest.fn().mockResolvedValue({id:'ps1'})},
      platformAdmin:{findFirst:jest.fn().mockResolvedValue(null)},
      tenant:{findUnique:jest.fn()},
      user:{findFirst:jest.fn()},
    };
    await expect(new TenantActiveGuard(db,reflector).canActivate(context({sub:'pa1',sid:'ps1',role:'platform_admin',platformAdmin:true}))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
