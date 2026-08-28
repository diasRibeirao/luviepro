import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QuotesService } from './quotes.service';

describe('QuotesService',()=>{
  const db:any={
    tenant:{findUnique:jest.fn()},
    planLimit:{findUnique:jest.fn()},
    quote:{findMany:jest.fn(),findFirst:jest.fn(),findUnique:jest.fn(),count:jest.fn(),create:jest.fn(),update:jest.fn()},
    quoteSequence:{upsert:jest.fn()},
    quoteVersion:{findMany:jest.fn(),create:jest.fn()},
    quoteItem:{deleteMany:jest.fn()},
    service:{findFirst:jest.fn()},
    client:{findFirst:jest.fn()},
    project:{upsert:jest.fn()},
    auditLog:{create:jest.fn(),findMany:jest.fn()},
    $transaction:jest.fn(),
  };
  let service:QuotesService;

  beforeEach(()=>{
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
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
    db.quote.findUnique.mockResolvedValue({id:'q1',tenantId:'t1',clientId:'c1',number:'ORC-1',status:'sent',clientDecision:null,validUntil:new Date(Date.now()+60000),client:{name:'Cliente'}});
    db.quote.update.mockResolvedValue({});
    db.project.upsert.mockResolvedValue({});
    await expect(service.decidePublicProposal('token','approved',' Maria ')).resolves.toEqual({ok:true,status:'approved'});
    expect(db.project.upsert).toHaveBeenCalledWith({where:{quoteId:'q1'},update:{},create:{tenantId:'t1',clientId:'c1',quoteId:'q1',name:'ORC-1 — Cliente'}});
    expect(db.quote.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'q1'},data:expect.objectContaining({clientDecision:'approved',clientDecisionName:'Maria'})}));
  });

  it('reuses an existing public token instead of generating another share identity',async()=>{
    const validUntil=new Date(Date.now()+60000);
    db.quote.findFirst.mockResolvedValue({id:'q1',tenantId:'t1',number:'ORC-1',status:'draft',validityDays:30,validUntil,publicToken:'existing-token',publicSharedAt:new Date()});
    db.quote.update.mockResolvedValue({number:'ORC-1',validUntil});
    await expect(service.shareQuote('t1','q1','u1')).resolves.toEqual({token:'existing-token',path:'/p/existing-token',validUntil});
    expect(db.quote.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'q1'},data:expect.objectContaining({publicToken:'existing-token'})}));
  });
});
