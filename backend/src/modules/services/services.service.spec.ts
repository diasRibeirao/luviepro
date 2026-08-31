import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

describe('ServicesService',()=>{
  const tx:any={
    serviceTeamMember:{deleteMany:jest.fn()},
    serviceCost:{deleteMany:jest.fn()},
    serviceStage:{deleteMany:jest.fn()},
    service:{update:jest.fn()},
  };
  const db:any={
    service:{findMany:jest.fn(),findFirst:jest.fn(),create:jest.fn(),aggregate:jest.fn()},
    auditLog:{create:jest.fn()},
    $transaction:jest.fn(),
  };
  let service:ServicesService;

  beforeEach(()=>{
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.service.aggregate.mockResolvedValue({_max:{sortOrder:null}});
    tx.serviceTeamMember.deleteMany.mockResolvedValue({});
    tx.serviceCost.deleteMany.mockResolvedValue({});
    tx.serviceStage.deleteMany.mockResolvedValue({});
    db.$transaction.mockImplementation((fn:any)=>fn(tx));
    service=new ServicesService(db);
  });

  it('scopes catalog and nested records to tenant',async()=>{
    db.service.findMany.mockResolvedValue([]);
    await service.list('tenant-a');
    expect(db.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId:'tenant-a'},
      include:expect.objectContaining({
        team:expect.objectContaining({where:{tenantId:'tenant-a'}}),
        costs:expect.objectContaining({where:{tenantId:'tenant-a'}}),
        stages:expect.objectContaining({where:{tenantId:'tenant-a'}}),
      }),
    }));
  });

  it('derives rates and costs from structured team and cost data',async()=>{
    db.service.create.mockImplementation(({data}:any)=>Promise.resolve({
      id:'s1',...data,team:data.team.create,costs:data.costs.create,stages:data.stages.create,
    }));
    const result:any=await service.create('t1',{
      name:'Implantação',billingUnit:'daily',dailyRateCents:999,defaultDays:2,people:2,
      variableCostCents:999,fixedCostCents:999,safetyMarginBps:2000,
      team:[{role:'Dev',dailyRateCents:500,included:true},{role:'QA',dailyRateCents:300,included:false}],
      costs:[{type:'variable',description:'Viagem',amountCents:100},{type:'fixed',description:'Setup',amountCents:200}],
      stages:[{sequence:2,description:'Entrega'},{sequence:1,description:'Descoberta'}],
    },'u1');
    expect(result.dailyRateCents).toBe(500);
    expect(result.variableCostCents).toBe(100);
    expect(result.fixedCostCents).toBe(200);
    expect(result.stages.map((x:any)=>x.sequence)).toEqual([1,2]);
  });

  it('rejects an update outside the tenant',async()=>{
    db.service.findFirst.mockResolvedValue(null);
    await expect(service.update('tenant-a','foreign',{name:'Outro'} as any,'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.service.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'foreign',tenantId:'tenant-a'}}));
  });

  it('preserves omitted nested collections on partial update',async()=>{
    const current:any={
      id:'s1',tenantId:'t1',name:'Serviço',code:'S1',description:'Desc',category:'Cat',
      billingUnit:'daily',dailyRateCents:500,defaultDays:2,people:1,variableCostCents:100,
      fixedCostCents:200,safetyMarginBps:1500,variableCostMode:'per_day',marginBase:'daily',active:true,
      team:[{role:'Dev',dailyRateCents:500,included:true}],
      costs:[{type:'variable',description:'Viagem',amountCents:100},{type:'fixed',description:'Setup',amountCents:200}],
      stages:[{sequence:1,description:'Execução',duration:'2 dias'}],
    };
    db.service.findFirst.mockResolvedValue(current);
    tx.service.update.mockImplementation(({data}:any)=>Promise.resolve({
      ...current,...data,team:data.team.create,costs:data.costs.create,stages:data.stages.create,
    }));
    const result:any=await service.update('t1','s1',{description:'Nova descrição'} as any,'u1');
    expect(result.name).toBe('Serviço');
    expect(result.team).toHaveLength(1);
    expect(result.costs).toHaveLength(2);
    expect(result.stages).toHaveLength(1);
  });

  it('persists variable cost mode and margin base',async()=>{
    db.service.create.mockImplementation(({data}:any)=>Promise.resolve({id:'s2',...data}));
    const result:any=await service.create('t1',{
      name:'Consultoria',billingUnit:'daily',dailyRateCents:1000,defaultDays:1,people:1,
      variableCostCents:0,fixedCostCents:0,safetyMarginBps:1000,
      variableCostMode:'per_person_day',marginBase:'subtotal',
    },'u1');
    expect(result.variableCostMode).toBe('per_person_day');
    expect(result.marginBase).toBe('subtotal');
  });
});
