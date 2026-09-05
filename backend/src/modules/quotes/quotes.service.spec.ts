import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QuotesService } from './quotes.service';

describe('QuotesService',()=>{
  const db:any={
    tenant:{findUnique:jest.fn()},
    planLimit:{findUnique:jest.fn()},
    quote:{findMany:jest.fn(),findFirst:jest.fn(),findUnique:jest.fn(),count:jest.fn(),create:jest.fn(),update:jest.fn(),updateMany:jest.fn()},
    quoteSequence:{upsert:jest.fn()},
    quoteVersion:{findMany:jest.fn(),create:jest.fn()},
    quoteItem:{deleteMany:jest.fn(),findMany:jest.fn()},
    quoteProductItem:{findMany:jest.fn(),deleteMany:jest.fn()},
    service:{findFirst:jest.fn()},
    client:{findFirst:jest.fn()},
    project:{upsert:jest.fn()},
    projectTask:{findMany:jest.fn(),createMany:jest.fn()},
    product:{findFirst:jest.fn(),update:jest.fn(),updateMany:jest.fn()},
    stockReservation:{findMany:jest.fn(),findUnique:jest.fn(),create:jest.fn(),update:jest.fn()},
    order:{create:jest.fn()},
    auditLog:{create:jest.fn(),findMany:jest.fn()},
    $transaction:jest.fn(),
  };
  let service:QuotesService;

  beforeEach(()=>{
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.quoteProductItem.findMany.mockResolvedValue([]);
    db.quoteItem.findMany.mockResolvedValue([]);
    db.projectTask.findMany.mockResolvedValue([]);
    db.projectTask.createMany.mockResolvedValue({count:0});
    db.quote.updateMany.mockResolvedValue({count:1});
    db.product.updateMany.mockResolvedValue({count:1});
    db.$transaction.mockImplementation(async(fn:any)=>fn(db));
    service=new QuotesService(db);
  });

  it('scopes quote detail to tenant',async()=>{
    db.quote.findFirst.mockResolvedValue(null);
    await expect(service.quote('tenant-a','q-foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.quote.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant-a',id:'q-foreign'}}));
  });

  it('enforces monthly quote capacity before create',async()=>{
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'starter'});
    db.planLimit.findUnique.mockResolvedValue({maxQuotesPerMonth:2});
    db.quote.count.mockResolvedValue(2);
    await expect(service.createQuote('t1',{clientId:'c1',items:[]})).rejects.toBeInstanceOf(BadRequestException);
    expect(db.client.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a second public proposal decision',async()=>{
    db.quote.findUnique.mockResolvedValue({id:'q1',tenantId:'t1',status:'approved',clientDecision:'approved',client:{name:'Cliente'}});
    await expect(service.decidePublicProposal('token','rejected','Pessoa')).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates project transactionally when public proposal is approved',async()=>{
    db.quote.findUnique.mockResolvedValue({id:'q1',tenantId:'t1',clientId:'c1',number:'OSO-1',status:'sent',clientDecision:null,validUntil:new Date(Date.now()+60000),client:{name:'Cliente'}});
    db.quote.update.mockResolvedValue({});
    db.quoteItem.findMany.mockResolvedValue([{id:'qi1',serviceName:'Organização',stages:[]}]);
    db.project.upsert.mockResolvedValue({id:'p1'});
    await expect(service.decidePublicProposal('token','approved',' Maria ')).resolves.toEqual({ok:true,status:'approved'});
    expect(db.project.upsert).toHaveBeenCalledWith({where:{quoteId:'q1'},update:{},create:{tenantId:'t1',clientId:'c1',quoteId:'q1',name:'OSO-1 — Cliente'}});
    expect(db.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'q1',status:'sent',clientDecision:null}),data:expect.objectContaining({clientDecision:'approved',clientDecisionName:'Maria'})}));
  });

  it('reuses an existing public token instead of generating another share identity',async()=>{
    const validUntil=new Date(Date.now()+60000);
    db.quote.findFirst.mockResolvedValue({id:'q1',tenantId:'t1',number:'OSO-1',status:'draft',validityDays:30,validUntil,publicToken:'existing-token',publicSharedAt:new Date()});
    db.quote.update.mockResolvedValue({number:'OSO-1',validUntil});
    await expect(service.shareQuote('t1','q1','u1')).resolves.toEqual({token:'existing-token',path:'/p/existing-token',validUntil});
    expect(db.quote.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'q1'},data:expect.objectContaining({publicToken:'existing-token'})}));
  });

  it('creates an order for an approved service-only quote',async()=>{
    db.quote.findFirst.mockResolvedValue({id:'q1',tenantId:'t1',number:'OSO-2026-001',status:'approved',finalTotalCents:350000,productItems:[],order:null});
    db.stockReservation.findMany.mockResolvedValue([]);
    db.order.create.mockResolvedValue({id:'o1',number:'OSO-2026-001',totalCents:350000,items:[]});
    await expect(service.confirmSale('t1','q1','u1')).resolves.toEqual(expect.objectContaining({number:'OSO-2026-001',totalCents:350000}));
    expect(db.order.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({totalCents:350000,items:{create:[]}})}));
  });

  it('duplicates a rejected proposal preserving the filled negotiation data',async()=>{
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'starter'});
    db.planLimit.findUnique.mockResolvedValue({maxQuotesPerMonth:20});
    db.quote.count.mockResolvedValue(1);
    db.quote.findFirst.mockResolvedValue({id:'q1',tenantId:'t1',clientId:'c1',number:'ORP-2026-005',status:'rejected',totalCents:7800,finalTotalCents:7800,discountBps:0,validityDays:30,notes:'Manter observação',paymentLinkUrl:'https://pay.test/abc',client:{id:'c1',name:'Silvia'},items:[],productItems:[{tenantId:'t1',productId:'p1',productName:'Colmeia P',sku:'COL-P',unit:'un',quantity:2,unitPriceCents:3900,unitCostCents:2000,discountBps:0,totalCents:7800}]});
    db.quoteSequence.upsert.mockResolvedValue({lastNumber:6});
    db.quote.create.mockResolvedValue({id:'q2',number:'ORP-2026-006',status:'draft'});
    await expect(service.duplicateQuote('t1','q1','u1')).resolves.toEqual(expect.objectContaining({id:'q2',number:'ORP-2026-006'}));
    expect(db.quote.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({clientId:'c1',status:'draft',totalCents:7800,finalTotalCents:7800,discountBps:0,validityDays:30,notes:'Manter observação',paymentLinkUrl:'https://pay.test/abc',productItems:{create:[expect.objectContaining({productId:'p1',productName:'Colmeia P',quantity:2,unitPriceCents:3900,totalCents:7800})]}})}));
  });

  it('rejects duplicated products before creating an inconsistent reservation',async()=>{
    db.product.findFirst.mockResolvedValue({id:'p1',name:'Caixa',sku:'CX1',unit:'un',costCents:1000,salePriceCents:2000,active:true});
    await expect((service as any).buildProductItems('t1',[{productId:'p1',quantity:1},{productId:'p1',quantity:2}])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses quote-specific stages instead of resetting to service defaults',async()=>{
    db.service.findFirst.mockResolvedValue({id:'s1',name:'Mudança',defaultDays:3,people:1,dailyRateCents:10000,variableCostCents:0,fixedCostCents:0,safetyMarginBps:0,stages:[{sequence:1,description:'Pré',duration:'1 dia'},{sequence:2,description:'Pós',duration:'2 dias'}]});
    const items=await (service as any).buildQuoteItems('t1',[{serviceId:'s1',days:1,people:1,stages:[{description:'Somente pré-mudança',duration:'1 dia'}]}]);
    expect(items[0].stages.create).toEqual([{tenantId:'t1',sequence:1,description:'Somente pré-mudança',duration:'1 dia'}]);
  });

  it('derives quote days from service stages when days are not manually informed',async()=>{
    db.service.findFirst.mockResolvedValue({id:'s1',name:'Casa Sob Medida',defaultDays:1,people:1,dailyRateCents:160000,variableCostCents:6500,fixedCostCents:129000,safetyMarginBps:5000,variableCostMode:'per_day',stages:[
      {sequence:1,description:'Triagem',duration:'1 dia'},
      {sequence:2,description:'Embalagem',duration:'1 dia'},
      {sequence:3,description:'Desembalagem',duration:'1 dia'},
      {sequence:4,description:'Pré-organização',duration:'1 dia'},
      {sequence:5,description:'Organização',duration:'2 dias'},
      {sequence:6,description:'Treinamento',duration:'1 dia'},
    ]});
    const items=await (service as any).buildQuoteItems('t1',[{serviceId:'s1'}]);
    expect(items[0].days).toBe(7);
    expect(items[0]).toEqual(expect.objectContaining({laborCents:1120000,variableCents:45500,fixedCents:129000,marginCents:102750,totalCents:1397250}));
    expect(items[0].configurationJson).toEqual(expect.objectContaining({daysSource:'stages'}));
  });

  it('keeps an explicit manual day override even when stages have another duration',async()=>{
    db.service.findFirst.mockResolvedValue({id:'s1',name:'Organização',defaultDays:5,people:1,dailyRateCents:10000,variableCostCents:0,fixedCostCents:0,safetyMarginBps:0,variableCostMode:'per_day',stages:[{sequence:1,description:'Execução',duration:'3 dias'}]});
    const items=await (service as any).buildQuoteItems('t1',[{serviceId:'s1',days:2}]);
    expect(items[0].days).toBe(2);
    expect(items[0].configurationJson).toEqual(expect.objectContaining({daysSource:'manual'}));
  });

  it('reserves product stock when proposal is sent to the client',async()=>{
    const tx:any={
      quoteProductItem:{findMany:jest.fn().mockResolvedValue([{productId:'p1',productName:'Colmeia',quantity:2,unit:'un'}])},
      stockReservation:{findUnique:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue({}),update:jest.fn()},
      product:{findFirst:jest.fn().mockResolvedValue({id:'p1',stockQuantity:10,reservedQuantity:0}),update:jest.fn().mockResolvedValue({id:'p1',stockQuantity:10,reservedQuantity:2}),updateMany:jest.fn().mockResolvedValue({count:1})},
    };

    await (service as any).reserveProducts(tx,'t1','q1');

    expect(tx.quoteProductItem.findMany).toHaveBeenCalledWith({where:{tenantId:'t1',quoteId:'q1'}});
    expect(tx.product.updateMany).toHaveBeenCalledWith({where:{id:'p1',tenantId:'t1',reservedQuantity:0},data:{reservedQuantity:{increment:2}}});
    expect(tx.stockReservation.create).toHaveBeenCalledWith({data:expect.objectContaining({tenantId:'t1',quoteId:'q1',productId:'p1',quantity:2,status:'active'})});
  });

  it('releases reservation when a sent proposal returns to draft',async()=>{
    const tx:any={
      stockReservation:{
        findMany:jest.fn().mockResolvedValue([{id:'r1',productId:'p1',quantity:2}]),
        update:jest.fn().mockResolvedValue({}),
      },
      product:{update:jest.fn().mockResolvedValue({})},
    };

    await (service as any).releaseProducts(tx,'t1','q1');

    expect(tx.stockReservation.findMany).toHaveBeenCalledWith({where:{tenantId:'t1',quoteId:'q1',status:'active'}});
    expect(tx.product.update).toHaveBeenCalledWith({where:{id:'p1'},data:{reservedQuantity:{decrement:2}}});
    expect(tx.stockReservation.update).toHaveBeenCalledWith({where:{id:'r1'},data:expect.objectContaining({status:'released'})});
  });

});
