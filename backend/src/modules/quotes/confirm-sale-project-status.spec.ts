import {BadRequestException} from '@nestjs/common';
import {QuotesService} from './quotes.service';

describe('QuotesService confirmSale project status',()=>{
  const makeDb=()=>{
    const db:any={
      quote:{findFirst:jest.fn()},
      projectStatus:{findFirst:jest.fn()},
      stockReservation:{findMany:jest.fn(),update:jest.fn()},
      product:{findFirst:jest.fn(),update:jest.fn()},
      order:{create:jest.fn(),findFirst:jest.fn()},
      stockMovement:{create:jest.fn()},
      quoteItem:{findMany:jest.fn()},
      project:{upsert:jest.fn()},
      projectTask:{findMany:jest.fn(),createMany:jest.fn()},
      auditLog:{create:jest.fn().mockResolvedValue({})},
      $transaction:jest.fn(),
    };
    db.$transaction.mockImplementation(async(fn:any)=>fn(db));
    db.quote.findFirst.mockResolvedValue({
      id:'q1',tenantId:'t1',clientId:'c1',number:'OSO-2026-010',
      status:'approved',finalTotalCents:250000,productItems:[],order:null,
      client:{name:'Cliente Teste'},
    });
    db.stockReservation.findMany.mockResolvedValue([]);
    db.order.create.mockResolvedValue({id:'o1',number:'OSO-2026-010',totalCents:250000,items:[]});
    db.quoteItem.findMany.mockResolvedValue([{id:'qi1',serviceName:'Organização',stages:[]}]);
    db.projectTask.findMany.mockResolvedValue([]);
    db.projectTask.createMany.mockResolvedValue({count:0});
    db.project.upsert.mockResolvedValue({id:'p1',status:'in_progress'});
    return db;
  };

  it('creates/updates the project in the selected active status while confirming the sale',async()=>{
    const db=makeDb();
    db.projectStatus.findFirst.mockResolvedValue({key:'in_progress'});
    const service=new QuotesService(db);

    await expect(service.confirmSale('t1','q1','u1','in_progress')).resolves.toEqual(
      expect.objectContaining({id:'o1'})
    );

    expect(db.projectStatus.findFirst).toHaveBeenCalledWith({
      where:{tenantId:'t1',key:'in_progress',active:true},
      select:{key:true},
    });
    expect(db.project.upsert).toHaveBeenCalledWith({
      where:{quoteId:'q1'},
      update:{status:'in_progress'},
      create:{
        tenantId:'t1',clientId:'c1',quoteId:'q1',
        name:'OSO-2026-010 — Cliente Teste',
        status:'in_progress',
      },
    });
  });

  it('rejects an inactive or foreign project status before generating the order',async()=>{
    const db=makeDb();
    db.projectStatus.findFirst.mockResolvedValue(null);
    const service=new QuotesService(db);

    await expect(service.confirmSale('t1','q1','u1','blocked')).rejects.toBeInstanceOf(BadRequestException);

    expect(db.order.create).not.toHaveBeenCalled();
    expect(db.project.upsert).not.toHaveBeenCalled();
  });

  it('keeps the existing default behavior when no project status is supplied',async()=>{
    const db=makeDb();
    const service=new QuotesService(db);

    await expect(service.confirmSale('t1','q1','u1')).resolves.toEqual(expect.objectContaining({id:'o1'}));

    expect(db.projectStatus.findFirst).not.toHaveBeenCalled();
    expect(db.project.upsert).toHaveBeenCalledWith({
      where:{quoteId:'q1'},
      update:{},
      create:{tenantId:'t1',clientId:'c1',quoteId:'q1',name:'OSO-2026-010 — Cliente Teste'},
    });
  });
});
