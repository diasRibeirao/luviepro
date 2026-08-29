import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';

describe('PlatformAdminService',()=>{
  const tx:any={
    tenant:{create:jest.fn(),update:jest.fn()},
    subscription:{create:jest.fn(),findFirst:jest.fn(),update:jest.fn()},
    userInvitation:{create:jest.fn()},
    user:{update:jest.fn()},
    authSession:{updateMany:jest.fn()},
  };
  const db:any={
    tenant:{count:jest.fn(),findMany:jest.fn(),findUnique:jest.fn()},
    user:{count:jest.fn(),findMany:jest.fn(),findUnique:jest.fn()},
    client:{count:jest.fn()},
    subscription:{count:jest.fn(),aggregate:jest.fn(),findMany:jest.fn(),findFirst:jest.fn(),create:jest.fn(),update:jest.fn()},
    payment:{count:jest.fn(),findMany:jest.fn()},
    planLimit:{findMany:jest.fn(),findUnique:jest.fn(),update:jest.fn()},
    userInvitation:{findFirst:jest.fn()},
    auditLog:{create:jest.fn()},
    $transaction:jest.fn(),
  };
  const mail:any={sendUserInvitation:jest.fn()};
  const auth:any={forgotPassword:jest.fn()};
  let service:PlatformAdminService;

  beforeEach(()=>{
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.$transaction.mockImplementation((fn:any)=>fn(tx));
    service=new PlatformAdminService(db,mail,auth);
  });

  it('returns the platform overview using global platform aggregates',async()=>{
    db.tenant.count.mockResolvedValueOnce(8).mockResolvedValueOnce(6);
    db.user.count.mockResolvedValue(20);db.client.count.mockResolvedValue(110);
    db.subscription.count.mockResolvedValue(6);db.subscription.aggregate.mockResolvedValue({_sum:{amountCents:49900}});
    await expect(service.overview()).resolves.toEqual({tenants:8,activeTenants:6,users:20,clients:110,subscriptions:6,monthlyRevenueCents:49900});
  });

  it('maps only one scheduled subscription per tenant',async()=>{
    db.tenant.findMany.mockResolvedValue([{id:'t1',name:'A',subscriptions:[{id:'s1'}]}]);
    await expect(service.tenants()).resolves.toEqual([{id:'t1',name:'A',scheduledSubscription:{id:'s1'}}]);
    expect(db.tenant.findMany).toHaveBeenCalledWith(expect.objectContaining({select:expect.objectContaining({subscriptions:expect.objectContaining({where:{status:'scheduled'},take:1})})}));
  });

  it('paginates and filters platform users on the server',async()=>{
    db.user.findMany.mockResolvedValue([{id:'u1',name:'Maria'}]);
    db.user.count.mockResolvedValue(21);
    await expect(service.users({page:2,pageSize:10,q:'maria',status:'active',plan:'pro',tenantId:'t1'})).resolves.toEqual({items:[{id:'u1',name:'Maria'}],total:21,page:2,pageSize:10,totalPages:3});
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({skip:10,take:10,where:expect.objectContaining({active:true,tenantId:'t1',tenant:{plan:'pro'}})}));
  });

  it('schedules a downgrade instead of changing the active tenant immediately',async()=>{
    const future=new Date(Date.now()+86400000);
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'business',planPeriod:'monthly',subscriptionExpiresAt:future});
    db.subscription.findFirst.mockResolvedValue(null);
    db.planLimit.findUnique.mockImplementation(({where}:any)=>Promise.resolve(where.plan==='pro'?{plan:'pro',active:true,sortOrder:20,monthlyPriceCents:9990,quarterlyPriceCents:26973,semiannualPriceCents:50949,annualPriceCents:95904}:{plan:'business',active:true,sortOrder:30,monthlyPriceCents:19990,quarterlyPriceCents:53973,semiannualPriceCents:101949,annualPriceCents:191904}));
    db.subscription.create.mockResolvedValue({id:'scheduled',plan:'pro',period:'monthly'});
    const result:any=await service.changeTenant('t1',{plan:'pro'});
    expect(result.scheduledSubscription.id).toBe('scheduled');
    expect(db.subscription.create).toHaveBeenCalledWith({data:expect.objectContaining({tenantId:'t1',plan:'pro',status:'scheduled',startsAt:future})});
  });

  it('rejects a second scheduled downgrade',async()=>{
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'business',planPeriod:'monthly',subscriptionExpiresAt:new Date(Date.now()+86400000)});
    db.planLimit.findUnique.mockImplementation(({where}:any)=>Promise.resolve(where.plan==='pro'?{plan:'pro',active:true,sortOrder:20,monthlyPriceCents:9990,quarterlyPriceCents:26973,semiannualPriceCents:50949,annualPriceCents:95904}:{plan:'business',active:true,sortOrder:30,monthlyPriceCents:19990,quarterlyPriceCents:53973,semiannualPriceCents:101949,annualPriceCents:191904}));
    db.subscription.findFirst.mockResolvedValue({id:'already'});
    await expect(service.changeTenant('t1',{plan:'pro'})).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a tenant with trial subscription and owner invitation',async()=>{
    db.user.findUnique.mockResolvedValue(null);db.userInvitation.findFirst.mockResolvedValue(null);
    db.planLimit.findUnique.mockResolvedValue({plan:'starter',active:true,sortOrder:10,monthlyPriceCents:4990,quarterlyPriceCents:13473,semiannualPriceCents:25449,annualPriceCents:47904});
    tx.tenant.create.mockResolvedValue({id:'t1',name:'Empresa'});tx.subscription.create.mockResolvedValue({id:'sub'});
    tx.userInvitation.create.mockResolvedValue({id:'inv',email:'owner@example.com',name:'Owner',expiresAt:new Date()});
    mail.sendUserInvitation.mockResolvedValue({sent:true});
    const result:any=await service.createTenant({company:'Empresa',ownerName:'Owner',ownerEmail:'OWNER@example.com',plan:'starter',period:'monthly'},'pa1');
    expect(tx.tenant.create).toHaveBeenCalledWith({data:expect.objectContaining({contactEmail:'owner@example.com',plan:'starter',planPeriod:'monthly'})});
    expect(tx.subscription.create).toHaveBeenCalledWith({data:expect.objectContaining({tenantId:'t1',status:'trial',amountCents:4990})});
    expect(result.invitation.delivery.sent).toBe(true);
  });

  it('revokes active sessions when a platform admin deactivates a user',async()=>{
    db.user.findUnique.mockResolvedValue({id:'u1',tenantId:'t1'});
    tx.user.update.mockResolvedValue({id:'u1',active:false});tx.authSession.updateMany.mockResolvedValue({count:2});
    await service.updateUser('u1',{active:false});
    expect(tx.authSession.updateMany).toHaveBeenCalledWith({where:{userId:'u1',revokedAt:null},data:expect.objectContaining({revokedReason:'user_deactivated'})});
  });

  it('does not send password recovery for an inactive user',async()=>{
    db.user.findUnique.mockResolvedValue({id:'u1',email:'a@b.com',active:false});
    await expect(service.passwordReset('u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(auth.forgotPassword).not.toHaveBeenCalled();
  });

  it('delegates password recovery to AuthService for active users',async()=>{
    db.user.findUnique.mockResolvedValue({id:'u1',email:'a@b.com',active:true});auth.forgotPassword.mockResolvedValue({ok:true});
    await expect(service.passwordReset('u1')).resolves.toEqual({ok:true});
    expect(auth.forgotPassword).toHaveBeenCalledWith('a@b.com');
  });

  it('rejects an unknown tenant and invalid plan',async()=>{
    db.tenant.findUnique.mockResolvedValue(null);
    await expect(service.changeTenant('missing',{})).rejects.toBeInstanceOf(NotFoundException);
    db.planLimit.findUnique.mockResolvedValue(null);
    await expect(service.updatePlan('enterprise',{})).rejects.toBeInstanceOf(NotFoundException);
  });
});
