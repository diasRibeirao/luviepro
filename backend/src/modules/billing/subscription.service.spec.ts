import { SubscriptionService } from './subscription.service';

describe('SubscriptionService',()=>{
  it('mantém o tenant quando não há assinatura agendada vencida',async()=>{
    const tenant={id:'t1',plan:'pro'};
    const db:any={subscription:{findFirst:jest.fn().mockResolvedValue(null)},tenant:{findUnique:jest.fn()}};
    const service=new SubscriptionService(db);
    await expect(service.activateScheduledIfDue('t1',tenant)).resolves.toBe(tenant);
    expect(db.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('ativa downgrade agendado somente no tenant correto',async()=>{
    const scheduled={id:'sub-s',tenantId:'t1',plan:'starter',period:'monthly',expiresAt:new Date('2026-10-01T00:00:00Z')};
    const tx:any={subscription:{updateMany:jest.fn().mockResolvedValueOnce({count:1}).mockResolvedValue({count:1})},tenant:{update:jest.fn().mockResolvedValue({id:'t1',plan:'starter'}),findUnique:jest.fn()}};
    const db:any={subscription:{findFirst:jest.fn().mockResolvedValue(scheduled)},$transaction:jest.fn((cb:any)=>cb(tx))};
    const service=new SubscriptionService(db);
    await service.activateScheduledIfDue('t1');
    expect(db.subscription.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'t1',status:'scheduled'})}));
    expect(tx.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'sub-s',tenantId:'t1',status:'scheduled'})}));
    expect(tx.tenant.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'t1'},data:expect.objectContaining({plan:'starter'})}));
  });
});
