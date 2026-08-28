import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';

describe('BillingService',()=>{
  const oldToken=process.env.MERCADO_PAGO_ACCESS_TOKEN;
  afterEach(()=>{jest.restoreAllMocks();if(oldToken===undefined)delete process.env.MERCADO_PAGO_ACCESS_TOKEN;else process.env.MERCADO_PAGO_ACCESS_TOKEN=oldToken;});

  it('reutiliza checkout recente e não duplica cobrança',async()=>{
    process.env.MERCADO_PAGO_ACCESS_TOKEN='test-token';
    const checkout={id:'pay-1',providerPreferenceId:'pref-1',checkoutUrl:'https://checkout.test/1',billingAction:'renewal'};
    const db:any={planLimit:{findUnique:jest.fn().mockResolvedValue({monthlyPriceCents:9990})},user:{findFirst:jest.fn().mockResolvedValue({id:'u1',email:'owner@test.local'})},payment:{findFirst:jest.fn().mockResolvedValue(checkout),create:jest.fn(),updateMany:jest.fn()},auditLog:{create:jest.fn().mockResolvedValue({})}};
    const subscriptions:any={activateScheduledIfDue:jest.fn().mockResolvedValue({id:'t1',plan:'pro',subscriptionExpiresAt:new Date(Date.now()+86400000)})};
    const service=new BillingService(db,subscriptions);
    const result=await service.createCheckout('t1','u1','pro','monthly');
    expect(result).toEqual(expect.objectContaining({paymentId:'pay-1',reused:true}));
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it('impede novo downgrade quando já existe alteração de plano agendada',async()=>{
    process.env.MERCADO_PAGO_ACCESS_TOKEN='test-token';
    const db:any={
      planLimit:{findUnique:jest.fn().mockResolvedValue({monthlyPriceCents:9990})},
      user:{findFirst:jest.fn().mockResolvedValue({id:'u1',email:'owner@test.local'})},
      subscription:{findFirst:jest.fn().mockResolvedValue({id:'scheduled-1',status:'scheduled'})},
      auditLog:{create:jest.fn().mockResolvedValue({})},
    };
    const subscriptions:any={activateScheduledIfDue:jest.fn().mockResolvedValue({id:'t1',plan:'business',subscriptionExpiresAt:new Date(Date.now()+86400000)})};
    const service=new BillingService(db,subscriptions);
    await expect(service.createCheckout('t1','u1','pro','monthly')).rejects.toBeInstanceOf(ConflictException);
  });

  it('isola reconciliação manual pelo tenant',async()=>{
    const db:any={payment:{findFirst:jest.fn().mockResolvedValue(null)}};
    const service=new BillingService(db,new SubscriptionService(db));
    await expect(service.reconcile('tenant-a','pay-b','u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.payment.findFirst).toHaveBeenCalledWith({where:{id:'pay-b',tenantId:'tenant-a'}});
  });

  it('rejeita valor remoto diferente da cobrança local',async()=>{
    const db:any={};const service=new BillingService(db,{} as any);
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:10,currency_id:'BRL',status:'approved'};
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:999,status:'pending'};
    await expect((service as any).processPaymentUnlocked(remote,local)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignora regressão de status depois de aprovado',async()=>{
    const db:any={auditLog:{create:jest.fn().mockResolvedValue({})}};
    const service=new BillingService(db,{} as any);
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:9990,status:'approved'};
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:99.9,currency_id:'BRL',status:'pending'};
    await expect((service as any).processPaymentUnlocked(remote,local)).resolves.toEqual(expect.objectContaining({status:'approved',ignored:true}));
  });


  it('rejeita metadado remoto incompatível com a cobrança local',async()=>{
    const db:any={};const service=new BillingService(db,{} as any);
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:99.9,currency_id:'BRL',status:'approved',metadata:{payment_id:'outro'}};
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:9990,status:'pending',plan:'pro',period:'monthly',billingAction:'renewal'};
    await expect((service as any).processPaymentUnlocked(remote,local)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('coloca tenant em payment_review quando assinatura efetiva sofre chargeback',async()=>{
    const tx:any={subscription:{update:jest.fn()},tenant:{update:jest.fn()}};
    const db:any={payment:{update:jest.fn()},subscription:{findUnique:jest.fn().mockResolvedValue({id:'s1',status:'active'})},$transaction:jest.fn((cb:any)=>cb(tx)),auditLog:{create:jest.fn().mockResolvedValue({})}};
    const service=new BillingService(db,{} as any);
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:99.9,currency_id:'BRL',status:'charged_back'};
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:9990,status:'approved',plan:'pro',period:'monthly',billingAction:'renewal',subscriptionId:'s1'};
    await (service as any).processPaymentUnlocked(remote,local);
    expect(tx.subscription.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'s1'},data:{status:'payment_review'}}));
    expect(tx.tenant.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'t1'},data:{status:'payment_review'}}));
  });

  it('cancela assinatura futura estornada sem bloquear o tenant atual',async()=>{
    const tx:any={subscription:{update:jest.fn()},tenant:{update:jest.fn()}};
    const db:any={payment:{update:jest.fn()},subscription:{findUnique:jest.fn().mockResolvedValue({id:'s2',status:'scheduled'})},$transaction:jest.fn((cb:any)=>cb(tx)),auditLog:{create:jest.fn().mockResolvedValue({})}};
    const service=new BillingService(db,{} as any);
    const remote={id:'mp2',external_reference:'ref2',transaction_amount:99.9,currency_id:'BRL',status:'refunded'};
    const local={id:'p2',tenantId:'t1',externalReference:'ref2',amountCents:9990,status:'approved',plan:'starter',period:'monthly',billingAction:'downgrade',subscriptionId:'s2'};
    await (service as any).processPaymentUnlocked(remote,local);
    expect(tx.subscription.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'s2'},data:{status:'cancelled'}}));
    expect(tx.tenant.update).not.toHaveBeenCalled();
  });

  it('não cria segunda assinatura quando aprovação já foi reclamada em transação concorrente',async()=>{
    const tx:any={payment:{updateMany:jest.fn().mockResolvedValue({count:0}),update:jest.fn()},subscription:{updateMany:jest.fn(),create:jest.fn()},tenant:{update:jest.fn()}};
    const db:any={$transaction:jest.fn((cb:any)=>cb(tx)),auditLog:{create:jest.fn().mockResolvedValue({})}};
    const subscriptions:any={activateScheduledIfDue:jest.fn().mockResolvedValue({id:'t1',plan:'starter',subscriptionExpiresAt:null})};
    const service=new BillingService(db,subscriptions);
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:9990,status:'pending',plan:'pro',period:'monthly',billingAction:'upgrade',payerEmail:'a@b.com'};
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:99.9,currency_id:'BRL',status:'approved'};
    await expect((service as any).processPaymentUnlocked(remote,local)).resolves.toEqual(expect.objectContaining({status:'approved',ignored:true}));
    expect(tx.subscription.create).not.toHaveBeenCalled();
  });

  it('processa downgrade aprovado como assinatura agendada',async()=>{
    const expiry=new Date(Date.now()+86400000*10);
    const tx:any={subscription:{updateMany:jest.fn(),create:jest.fn().mockResolvedValue({id:'s2'})},tenant:{update:jest.fn()},payment:{updateMany:jest.fn().mockResolvedValue({count:1}),update:jest.fn()}};
    const db:any={$transaction:jest.fn((cb:any)=>cb(tx)),auditLog:{create:jest.fn().mockResolvedValue({})}};
    const subscriptions:any={activateScheduledIfDue:jest.fn().mockResolvedValue({id:'t1',plan:'business',subscriptionExpiresAt:expiry})};
    const service=new BillingService(db,subscriptions);
    const local={id:'p1',tenantId:'t1',externalReference:'ref1',amountCents:9990,status:'pending',plan:'pro',period:'monthly',billingAction:'downgrade',payerEmail:'a@b.com'};
    const remote={id:'mp1',external_reference:'ref1',transaction_amount:99.9,currency_id:'BRL',status:'approved'};
    await (service as any).processPaymentUnlocked(remote,local);
    expect(tx.subscription.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({tenantId:'t1',plan:'pro',status:'scheduled',startsAt:expiry})}));
    expect(tx.tenant.update).not.toHaveBeenCalled();
  });
});

describe('BillingService reliability',()=>{
  it('deduplica webhook já processado de forma persistente',async()=>{
    const db:any={webhookEvent:{create:jest.fn().mockRejectedValue({code:'P2002'}),findUnique:jest.fn().mockResolvedValue({id:'evt1',status:'processed',eventKey:'req1'})}};
    const service=new BillingService(db,{} as any);
    const result=await (service as any).claimWebhookEvent({type:'payment'},'mp1','req1');
    expect(result).toEqual(expect.objectContaining({duplicate:true,event:expect.objectContaining({status:'processed'})}));
  });

  it('permite retry de webhook persistido como failed',async()=>{
    const db:any={webhookEvent:{create:jest.fn().mockRejectedValue({code:'P2002'}),findUnique:jest.fn().mockResolvedValueOnce({id:'evt1',status:'failed',eventKey:'req1'}).mockResolvedValueOnce({id:'evt1',status:'processing',attempts:2}),updateMany:jest.fn().mockResolvedValue({count:1})}};
    const service=new BillingService(db,{} as any);
    const result=await (service as any).claimWebhookEvent({type:'payment'},'mp1','req1');
    expect(result.duplicate).toBe(false);
    expect(db.webhookEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'evt1'}),data:expect.objectContaining({status:'processing',attempts:{increment:1}})}));
  });

  it('métricas de billing são sempre isoladas pelo tenant',async()=>{
    const db:any={payment:{groupBy:jest.fn().mockResolvedValue([]),count:jest.fn().mockResolvedValue(0),aggregate:jest.fn().mockResolvedValue({_count:{_all:0},_sum:{amountCents:null}})},webhookEvent:{count:jest.fn().mockResolvedValue(0)}};
    const service=new BillingService(db,{} as any);
    await service.metrics('tenant-a');
    expect(db.payment.groupBy).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant-a'}}));
    expect(db.webhookEvent.count).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'tenant-a'})}));
  });
});
