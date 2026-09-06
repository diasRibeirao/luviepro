import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

describe('ServicesService',()=>{
  const tx:any={
    serviceTeamMember:{deleteMany:jest.fn()},
    serviceCost:{deleteMany:jest.fn()},
    serviceStage:{deleteMany:jest.fn()},
    service:{findFirst:jest.fn(),update:jest.fn(),aggregate:jest.fn(),create:jest.fn()},
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
    tx.service.findFirst.mockReset();
    tx.service.update.mockReset();
    tx.service.aggregate.mockReset();
    tx.service.create.mockReset();
    tx.service.aggregate.mockResolvedValue({_max:{sortOrder:null}});
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
    tx.service.create.mockImplementation(({data}:any)=>Promise.resolve({
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
    tx.service.create.mockImplementation(({data}:any)=>Promise.resolve({id:'s2',...data}));
    const result:any=await service.create('t1',{
      name:'Consultoria',billingUnit:'daily',dailyRateCents:1000,defaultDays:1,people:1,
      variableCostCents:0,fixedCostCents:0,safetyMarginBps:1000,
      variableCostMode:'per_person_day',marginBase:'subtotal',
    },'u1');
    expect(result.variableCostMode).toBe('per_person_day');
    expect(result.marginBase).toBe('subtotal');
  });
  it('reorders inside a serializable transaction and swaps the neighbor atomically',async()=>{
    tx.service.findFirst
      .mockResolvedValueOnce({id:'s2',tenantId:'t1',active:true,sortOrder:20})
      .mockResolvedValueOnce({id:'s1',tenantId:'t1',active:true,sortOrder:10});
    tx.service.update.mockResolvedValue({});
    db.service.findMany.mockResolvedValue([]);

    await service.reorder('t1','s2','up','u1');

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:'Serializable'});
    expect(tx.service.findFirst).toHaveBeenNthCalledWith(1,{where:{id:'s2',tenantId:'t1'}});
    expect(tx.service.findFirst).toHaveBeenNthCalledWith(2,{
      where:{tenantId:'t1',id:{not:'s2'},active:true,sortOrder:{lt:20}},
      orderBy:{sortOrder:'desc'},
    });
    expect(tx.service.update).toHaveBeenNthCalledWith(1,{where:{id:'s2'},data:{sortOrder:10}});
    expect(tx.service.update).toHaveBeenNthCalledWith(2,{where:{id:'s1'},data:{sortOrder:20}});
  });

  it('retries a serialization conflict before reordering',async()=>{
    let attempts=0;
    db.$transaction.mockImplementation(async(fn:any,options:any)=>{
      expect(options).toEqual({isolationLevel:'Serializable'});
      attempts++;
      if(attempts===1)throw {code:'P2034'};
      return fn(tx);
    });
    tx.service.findFirst
      .mockResolvedValueOnce({id:'s2',tenantId:'t1',active:true,sortOrder:20})
      .mockResolvedValueOnce({id:'s1',tenantId:'t1',active:true,sortOrder:10});
    tx.service.update.mockResolvedValue({});
    db.service.findMany.mockResolvedValue([]);

    await service.reorder('t1','s2','up','u1');

    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.service.update).toHaveBeenCalledTimes(2);
  });

  it('does not audit when there is no neighbor to reorder',async()=>{
    tx.service.findFirst
      .mockResolvedValueOnce({id:'s1',tenantId:'t1',active:true,sortOrder:10})
      .mockResolvedValueOnce(null);
    db.service.findMany.mockResolvedValue([]);

    await service.reorder('t1','s1','up','u1');

    expect(tx.service.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('assigns automatic sortOrder inside a serializable transaction',async()=>{
    tx.service.aggregate.mockResolvedValue({_max:{sortOrder:30}});
    tx.service.create.mockImplementation(({data}:any)=>Promise.resolve({id:'s4',...data}));

    const result:any=await service.create('t1',{
      name:'Novo serviço',billingUnit:'daily',dailyRateCents:1000,defaultDays:1,people:1,
      variableCostCents:0,fixedCostCents:0,safetyMarginBps:1000,
    },'u1');

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:'Serializable'});
    expect(tx.service.aggregate).toHaveBeenCalledWith({where:{tenantId:'t1'},_max:{sortOrder:true}});
    expect(tx.service.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({tenantId:'t1',sortOrder:40}),
    }));
    expect(result.sortOrder).toBe(40);
  });

  it('retries automatic sortOrder allocation after P2034',async()=>{
    let attempts=0;
    db.$transaction.mockImplementation(async(fn:any,options:any)=>{
      expect(options).toEqual({isolationLevel:'Serializable'});
      attempts++;
      if(attempts===1)throw {code:'P2034'};
      return fn(tx);
    });
    tx.service.aggregate.mockResolvedValue({_max:{sortOrder:40}});
    tx.service.create.mockImplementation(({data}:any)=>Promise.resolve({id:'s5',...data}));

    const result:any=await service.create('t1',{
      name:'Concorrente',billingUnit:'daily',dailyRateCents:1000,defaultDays:1,people:1,
      variableCostCents:0,fixedCostCents:0,safetyMarginBps:1000,
    },'u1');

    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.service.aggregate).toHaveBeenCalledTimes(1);
    expect(result.sortOrder).toBe(50);
  });

  it('preserves an explicit sortOrder without reading the catalog maximum',async()=>{
    tx.service.create.mockImplementation(({data}:any)=>Promise.resolve({id:'s6',...data}));

    const result:any=await service.create('t1',{
      name:'Posicionado',billingUnit:'daily',dailyRateCents:1000,defaultDays:1,people:1,
      variableCostCents:0,fixedCostCents:0,safetyMarginBps:1000,sortOrder:25,
    } as any,'u1');

    expect(tx.service.aggregate).not.toHaveBeenCalled();
    expect(result.sortOrder).toBe(25);
  });

});
