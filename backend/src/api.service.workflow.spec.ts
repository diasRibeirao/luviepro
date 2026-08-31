import { BadRequestException } from '@nestjs/common';
import { ApiService } from './api.service';

describe('ApiService workflows',()=>{
  const jwt:any={};
  const mail:any={sendUserInvitation:jest.fn().mockResolvedValue({sent:false,reason:'not_configured'})};
  it('envia orçamento e calcula validade',async()=>{
    const quote={id:'q1',tenantId:'t1',status:'draft',validityDays:30,sentAt:null,validUntil:null};
    const db:any={
      quote:{findFirst:jest.fn().mockResolvedValue(quote),update:jest.fn().mockImplementation(({data}:any)=>Promise.resolve({...quote,...data}))},
      auditLog:{create:jest.fn().mockResolvedValue({})},
      $transaction:jest.fn().mockImplementation(async(fn:any)=>fn(db)),
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
});
