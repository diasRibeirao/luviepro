import { SubscriptionService } from './subscription.service';

describe('SubscriptionService expiration reconciliation',()=>{
  it('marca tenant e assinatura vencidos de forma atômica',async()=>{
    const past=new Date(Date.now()-60_000);
    const db:any={
      tenant:{
        findMany:jest.fn().mockResolvedValue([{id:'t1',plan:'pro',status:'active',subscriptionExpiresAt:past}]),
        findUnique:jest.fn(),
        updateMany:jest.fn().mockResolvedValue({count:1}),
        update:jest.fn(),
      },
      subscription:{
        findFirst:jest.fn().mockResolvedValue(null),
        updateMany:jest.fn().mockResolvedValue({count:1}),
      },
      $transaction:jest.fn(async(fn:any)=>fn(db)),
    };
    const service=new SubscriptionService(db);
    const result=await service.reconcileExpiredBatch(10);
    expect(result).toEqual({scanned:1,expired:1,activatedScheduled:0});
    expect(db.tenant.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'t1',status:'active'}),data:{status:'expired'}}));
    expect(db.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'t1',status:{in:['active','trial']}}),data:{status:'expired'}}));
  });

  it('não expira tenant quando uma assinatura agendada já venceu e é ativada',async()=>{
    const past=new Date(Date.now()-60_000),future=new Date(Date.now()+86_400_000);
    const db:any={
      tenant:{
        findMany:jest.fn().mockResolvedValue([{id:'t1',plan:'pro',status:'active',subscriptionExpiresAt:past}]),
        findUnique:jest.fn(),updateMany:jest.fn(),
        update:jest.fn().mockResolvedValue({id:'t1',plan:'starter',status:'active',subscriptionExpiresAt:future}),
      },
      subscription:{
        findFirst:jest.fn().mockResolvedValue({id:'s2',tenantId:'t1',plan:'starter',period:'monthly',status:'scheduled',startsAt:past,expiresAt:future}),
        updateMany:jest.fn().mockResolvedValue({count:1}),
      },
      $transaction:jest.fn(async(fn:any)=>fn(db)),
    };
    const service=new SubscriptionService(db);
    const result=await service.reconcileExpiredBatch(10);
    expect(result.expired).toBe(0);
    expect(result.activatedScheduled).toBe(1);
    expect(db.tenant.updateMany).not.toHaveBeenCalled();
  });
});
