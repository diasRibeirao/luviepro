import {BadRequestException} from '@nestjs/common';
import {AccessManagementService} from './access-management.service';

describe('AccessManagementService resend invitation transaction',()=>{
  beforeEach(()=>jest.clearAllMocks());
  const mail:any={sendUserInvitation:jest.fn().mockResolvedValue({sent:true})};
  const sessions:any={};
  const makeDb=()=>{
    const db:any={
      userInvitation:{findFirst:jest.fn(),count:jest.fn(),updateMany:jest.fn()},
      planLimit:{findUnique:jest.fn()},
      user:{count:jest.fn(),findUnique:jest.fn()},
      auditLog:{create:jest.fn().mockResolvedValue({})},
      $transaction:jest.fn(),
    };
    db.$transaction.mockImplementation(async(callback:any,options:any)=>{
      expect(options).toEqual({isolationLevel:'Serializable'});
      return callback(db);
    });
    db.user.findUnique.mockResolvedValue(null);
    db.user.count.mockResolvedValue(1);
    db.userInvitation.count.mockResolvedValue(0);
    db.planLimit.findUnique.mockResolvedValue({maxUsers:10});
    return db;
  };
  const invitation=(overrides:any={})=>({
    id:'inv-1',tenantId:'t1',name:'Maria',email:'maria@example.com',role:'admin',
    customProfileId:'profile-1',customProfile:{id:'profile-1',name:'Operação',active:true},
    tenant:{id:'t1',name:'Tenant',plan:'business'},status:'expired',
    expiresAt:new Date(Date.now()-1000),updatedAt:new Date('2026-09-06T10:00:00Z'),...overrides,
  });

  it('revalidates invitation, profile and capacity inside a Serializable transaction',async()=>{
    const db=makeDb();
    db.userInvitation.findFirst.mockResolvedValue(invitation());
    db.userInvitation.updateMany.mockResolvedValue({count:1});
    const service=new AccessManagementService(db,mail,sessions);
    await expect(service.resendUserInvitation('t1','inv-1','owner')).resolves.toEqual(expect.objectContaining({id:'inv-1',status:'pending'}));
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.planLimit.findUnique).toHaveBeenCalledWith({where:{plan:'business'}});
    expect(db.userInvitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:'inv-1',tenantId:'t1'})}));
  });

  it('does not resend when the custom profile became inactive',async()=>{
    const db=makeDb();
    db.userInvitation.findFirst.mockResolvedValue(invitation({customProfile:{id:'profile-1',name:'Operação',active:false}}));
    const service=new AccessManagementService(db,mail,sessions);
    await expect(service.resendUserInvitation('t1','inv-1','owner')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.userInvitation.updateMany).not.toHaveBeenCalled();
    expect(mail.sendUserInvitation).not.toHaveBeenCalled();
  });

  it('retries the whole validation after a P2034 serialization conflict',async()=>{
    const db=makeDb();
    let attempts=0;
    db.$transaction.mockImplementation(async(callback:any)=>{
      attempts++;
      if(attempts===1)throw {code:'P2034'};
      return callback(db);
    });
    db.userInvitation.findFirst.mockResolvedValue(invitation());
    db.userInvitation.updateMany.mockResolvedValue({count:1});
    const service=new AccessManagementService(db,mail,sessions);
    await expect(service.resendUserInvitation('t1','inv-1','owner')).resolves.toEqual(expect.objectContaining({status:'pending'}));
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
});
