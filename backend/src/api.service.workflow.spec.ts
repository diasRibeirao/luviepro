import { BadRequestException } from '@nestjs/common';
import { ApiService } from './api.service';

describe('ApiService workflows',()=>{
  const jwt:any={};
  const mail:any={sendUserInvitation:jest.fn().mockResolvedValue({sent:false,reason:'not_configured'})};
  it('envia orçamento e calcula validade',async()=>{
    const quote={id:'q1',tenantId:'t1',status:'draft',validityDays:30,sentAt:null,validUntil:null};
    const db:any={
      quote:{findFirst:jest.fn().mockResolvedValue(quote),update:jest.fn().mockImplementation(({data}:any)=>Promise.resolve({...quote,...data}))},
      auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    const service=new ApiService(db,jwt,mail);
    const result=await service.updateQuoteStatus('t1','q1','sent','u1');
    expect(result.status).toBe('sent'); expect(result.sentAt).toBeInstanceOf(Date); expect(result.validUntil).toBeInstanceOf(Date);
  });
  it('bloqueia transição inválida de orçamento',async()=>{
    const db:any={quote:{findFirst:jest.fn().mockResolvedValue({id:'q1',tenantId:'t1',status:'approved'})}};
    const service=new ApiService(db,jwt,mail);
    await expect(service.updateQuoteStatus('t1','q1','draft','u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revoga link público sem alterar o orçamento',async()=>{
    const quote={id:'q1',tenantId:'t1',number:'ORC-2026-001',publicToken:'abc'};
    const db:any={quote:{findFirst:jest.fn().mockResolvedValue(quote),update:jest.fn().mockResolvedValue({...quote,publicToken:null})},auditLog:{create:jest.fn().mockResolvedValue({})}};
    const service=new ApiService(db,jwt,mail);
    await expect(service.revokeQuoteShare('t1','q1','u1')).resolves.toEqual({ok:true});
    expect(db.quote.update).toHaveBeenCalledWith({where:{id:'q1'},data:{publicToken:null,publicSharedAt:null}});
  });

  it('monta linha do tempo comercial do orçamento',async()=>{
    const createdAt=new Date('2026-08-26T10:00:00Z');
    const db:any={
      quote:{findFirst:jest.fn().mockResolvedValue({id:'q1',createdAt,updatedAt:createdAt,sentAt:null,approvedAt:null,clientDecision:null,clientDecisionAt:null,clientDecisionName:null,status:'sent',version:2})},
      auditLog:{findMany:jest.fn().mockResolvedValue([{action:'share',createdAt:new Date('2026-08-26T11:00:00Z'),metadata:{number:'ORC-2026-001'}},{action:'client_approved',createdAt:new Date('2026-08-26T12:00:00Z'),metadata:{name:'Cliente Teste'}}])}
    };
    const service=new ApiService(db,jwt,mail);const events=await service.quoteTimeline('t1','q1');
    expect(events.map((x:any)=>x.title)).toEqual(['Cliente aprovou a proposta','Link público compartilhado','Orçamento criado']);
  });
  it('conclui projeto quando todas as tarefas terminam',async()=>{
    const task={id:'x',tenantId:'t1',projectId:'p1',status:'pending',title:'Entrega',completedAt:null,dueDate:null,description:null};
    const db:any={
      projectTask:{findFirst:jest.fn().mockResolvedValue(task),update:jest.fn().mockResolvedValue({...task,status:'completed'}) ,count:jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(2)},
      project:{update:jest.fn().mockResolvedValue({})}, auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    const service=new ApiService(db,jwt,mail);
    await service.updateProjectTask('t1','p1','x',{status:'completed'},'u1');
    expect(db.project.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({progress:100,status:'completed'})}));
  });
  it('retoma checkout pendente recente sem criar cobrança duplicada',async()=>{
    const previousToken=process.env.MERCADO_PAGO_ACCESS_TOKEN;process.env.MERCADO_PAGO_ACCESS_TOKEN='test-token';
    const checkout={id:'pay-1',providerPreferenceId:'pref-1',checkoutUrl:'https://checkout.test/1',billingAction:'renewal'};
    const db:any={
      planLimit:{findUnique:jest.fn().mockResolvedValue({monthlyPriceCents:9990})},
      user:{findFirst:jest.fn().mockResolvedValue({id:'u1',email:'owner@test.local'})},
      payment:{findFirst:jest.fn().mockResolvedValue(checkout),create:jest.fn(),updateMany:jest.fn()},
      auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    const service=new ApiService(db,jwt,mail);jest.spyOn(service as any,'activateScheduledSubscriptionIfDue').mockResolvedValue({id:'t1',plan:'pro',subscriptionExpiresAt:new Date(Date.now()+86400000)});
    const result=await service.createCheckout('t1','u1','pro','monthly');
    expect(result).toEqual(expect.objectContaining({paymentId:'pay-1',checkoutUrl:checkout.checkoutUrl,reused:true}));
    expect(db.payment.create).not.toHaveBeenCalled();expect(db.payment.updateMany).not.toHaveBeenCalled();
    if(previousToken===undefined)delete process.env.MERCADO_PAGO_ACCESS_TOKEN;else process.env.MERCADO_PAGO_ACCESS_TOKEN=previousToken;
  });
  it('reaproveita o checkout criado por uma requisição concorrente',async()=>{
    const checkout={id:'pay-concurrent',providerPreferenceId:'pref-concurrent',checkoutUrl:'https://checkout.test/concurrent',billingAction:'upgrade'};
    const db:any={
      payment:{findFirst:jest.fn().mockResolvedValue(checkout)},
      auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    const redis:any={withLock:jest.fn().mockResolvedValue({acquired:false})};
    const service=new ApiService(db,jwt,mail,redis);
    const result=await service.createCheckout('t1','u1','business','annual');
    expect(result).toEqual(expect.objectContaining({paymentId:'pay-concurrent',checkoutUrl:checkout.checkoutUrl,reused:true}));
    expect(redis.withLock).toHaveBeenCalledWith('checkout:t1:business:annual',20_000,expect.any(Function));
    expect(db.payment.findFirst).toHaveBeenCalledTimes(1);
  });
  it('não cria assinatura duplicada quando o webhook concorrente já foi processado',async()=>{
    const approved={id:'pay-approved',tenantId:'t1',externalReference:'ref-approved',amountCents:9990,currency:'BRL',status:'approved',payerEmail:'owner@test.local',subscriptionId:'sub-1'};
    const db:any={
      payment:{findUnique:jest.fn().mockResolvedValue(approved),update:jest.fn().mockResolvedValue(approved)},
      subscription:{create:jest.fn()},
      auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    const redis:any={withLock:jest.fn().mockImplementation(async(_key:string,_ttl:number,callback:()=>Promise<any>)=>({acquired:true,value:await callback()}))};
    const service=new ApiService(db,jwt,mail,redis);
    const remote={id:'mp-1',external_reference:'ref-approved',transaction_amount:99.9,currency_id:'BRL',status:'approved',payer:{email:'owner@test.local'}};
    const result=await (service as any).processMercadoPagoPayment(remote,{...approved,status:'pending'});
    expect(result).toEqual({ok:true,status:'approved',paymentId:'pay-approved'});
    expect(db.payment.findUnique).toHaveBeenCalledWith({where:{id:'pay-approved'}});
    expect(db.subscription.create).not.toHaveBeenCalled();
  });
  it('ignora webhook antigo que tentaria rebaixar pagamento aprovado',async()=>{
    const approved={id:'pay-approved',tenantId:'t1',externalReference:'ref-approved',amountCents:9990,currency:'BRL',status:'approved'};
    const db:any={payment:{findUnique:jest.fn().mockResolvedValue(approved),update:jest.fn()},auditLog:{create:jest.fn().mockResolvedValue({})}};
    const redis:any={withLock:jest.fn().mockImplementation(async(_key:string,_ttl:number,callback:()=>Promise<any>)=>({acquired:true,value:await callback()}))};
    const service=new ApiService(db,jwt,mail,redis);
    const remote={id:'mp-1',external_reference:'ref-approved',transaction_amount:99.9,currency_id:'BRL',status:'pending'};
    const result=await (service as any).processMercadoPagoPayment(remote,approved);
    expect(result).toEqual(expect.objectContaining({status:'approved',ignored:true}));
    expect(db.payment.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({action:'payment_status_regression_ignored'})}));
  });
  it('expira tentativa antiga e cria um novo checkout',async()=>{
    const previousToken=process.env.MERCADO_PAGO_ACCESS_TOKEN,previousSandbox=process.env.MERCADO_PAGO_USE_SANDBOX,previousFetch=global.fetch;
    process.env.MERCADO_PAGO_ACCESS_TOKEN='test-token';process.env.MERCADO_PAGO_USE_SANDBOX='true';
    const payment={id:'pay-2',externalReference:'ref-2',plan:'pro',period:'monthly',amountCents:9990,status:'pending',billingAction:'renewal'};
    const db:any={
      planLimit:{findUnique:jest.fn().mockResolvedValue({monthlyPriceCents:9990})},
      user:{findFirst:jest.fn().mockResolvedValue({id:'u1',email:'owner@test.local'})},
      payment:{findFirst:jest.fn().mockResolvedValue(null),updateMany:jest.fn().mockResolvedValue({count:1}),create:jest.fn().mockResolvedValue(payment),update:jest.fn().mockResolvedValue(payment)},
      auditLog:{create:jest.fn().mockResolvedValue({})}
    };
    global.fetch=jest.fn().mockResolvedValue({ok:true,json:jest.fn().mockResolvedValue({id:'pref-2',sandbox_init_point:'https://checkout.test/2'})}) as any;
    try{
      const service=new ApiService(db,jwt,mail);jest.spyOn(service as any,'activateScheduledSubscriptionIfDue').mockResolvedValue({id:'t1',plan:'pro',subscriptionExpiresAt:new Date(Date.now()+86400000)});
      const result=await service.createCheckout('t1','u1','pro','monthly');
      expect(result).toEqual(expect.objectContaining({paymentId:'pay-2',checkoutUrl:'https://checkout.test/2'}));
      expect(result.reused).toBeUndefined();expect(db.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'cancelled',providerStatusDetail:'checkout_expired'})}));expect(db.payment.create).toHaveBeenCalledTimes(1);
    }finally{
      global.fetch=previousFetch;if(previousToken===undefined)delete process.env.MERCADO_PAGO_ACCESS_TOKEN;else process.env.MERCADO_PAGO_ACCESS_TOKEN=previousToken;if(previousSandbox===undefined)delete process.env.MERCADO_PAGO_USE_SANDBOX;else process.env.MERCADO_PAGO_USE_SANDBOX=previousSandbox;
    }
  });
  it('ao listar pagamentos expira apenas checkout sem pagamento no provedor',async()=>{
    const db:any={payment:{updateMany:jest.fn().mockResolvedValue({count:1}),findMany:jest.fn().mockResolvedValue([])}};
    const service=new ApiService(db,jwt,mail);jest.spyOn(service as any,'activateScheduledSubscriptionIfDue').mockResolvedValue({id:'t1'});
    await expect(service.billingPayments('t1')).resolves.toEqual([]);
    expect(db.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'t1',status:'pending',providerPaymentId:null})}));
  });
});
