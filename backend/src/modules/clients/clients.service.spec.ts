import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';

describe('ClientsService',()=>{
  const db:any={
    tenant:{findUnique:jest.fn()},
    planLimit:{findUnique:jest.fn()},
    client:{findMany:jest.fn(),findFirst:jest.fn(),count:jest.fn(),create:jest.fn(),update:jest.fn()},
    auditLog:{create:jest.fn()},
    $transaction:jest.fn(),
  };
  let service:ClientsService;

  beforeEach(()=>{
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.$transaction.mockImplementation(async(fn:any)=>fn(db));
    service=new ClientsService(db);
  });

  it('scopes client listing to tenant',async()=>{
    db.client.findMany.mockResolvedValue([]);
    await service.list('tenant-a');
    expect(db.client.findMany).toHaveBeenCalledWith({where:{tenantId:'tenant-a'},orderBy:{name:'asc'}});
  });

  it('enforces plan capacity before creating an active client',async()=>{
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'starter'});
    db.planLimit.findUnique.mockResolvedValue({maxClients:2});
    db.client.count.mockResolvedValue(2);
    await expect(service.create('t1',{type:'individual',name:'Cliente'} as any,'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.client.create).not.toHaveBeenCalled();
  });

  it('does not allow updating a client from another tenant',async()=>{
    db.client.findFirst.mockResolvedValue(null);
    await expect(service.update('tenant-a','foreign',{name:'Outro'} as any,'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.client.findFirst).toHaveBeenCalledWith({where:{id:'foreign',tenantId:'tenant-a'}});
  });

  it('preserves omitted fields on partial update',async()=>{
    const current={id:'c1',tenantId:'t1',type:'company',name:'Empresa',legalName:'Empresa LTDA',document:'123',stateRegistration:null,municipalRegistration:null,contactName:'Ana',phone:'11',whatsapp:'22',email:'a@b.com',zipCode:'1',addressLine:'Rua',addressNumber:'10',addressComplement:null,neighborhood:'Centro',city:'SP',state:'SP',notes:'N',active:true};
    db.client.findFirst.mockResolvedValue(current);
    db.client.update.mockImplementation(({data}:any)=>Promise.resolve({...current,...data}));
    const updated=await service.update('t1','c1',{phone:'99'} as any,'u1');
    expect(updated.name).toBe('Empresa');
    expect(updated.legalName).toBe('Empresa LTDA');
    expect(updated.phone).toBe('99');
  });

  it('checks capacity when reactivating an inactive client',async()=>{
    db.client.findFirst.mockResolvedValue({id:'c1',tenantId:'t1',type:'individual',name:'Cliente',active:false});
    db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'pro'});
    db.planLimit.findUnique.mockResolvedValue({maxClients:3});
    db.client.count.mockResolvedValue(3);
    await expect(service.update('t1','c1',{active:true} as any,'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.client.update).not.toHaveBeenCalled();
  });
});
