import {BadRequestException} from '@nestjs/common';
import {AccessManagementService} from './access-management.service';

describe('AccessManagementService createUser custom profile concurrency',()=>{
  beforeEach(()=>{
    jest.clearAllMocks();
  });

  const makeDb=()=>{
    const db:any={
      tenant:{findUnique:jest.fn()},
      planLimit:{findUnique:jest.fn()},
      accessProfile:{findFirst:jest.fn()},
      user:{count:jest.fn(),findUnique:jest.fn()},
      userInvitation:{count:jest.fn(),findFirst:jest.fn(),create:jest.fn()},
      auditLog:{create:jest.fn().mockResolvedValue({})},
      $transaction:jest.fn(),
    };
    db.$transaction.mockImplementation(async(callback:any,options:any)=>{
      expect(options).toEqual({isolationLevel:'Serializable'});
      return callback(db);
    });
    db.tenant.findUnique.mockResolvedValue({id:'t1',name:'Tenant',plan:'business'});
    db.planLimit.findUnique.mockResolvedValue({maxUsers:10,customRoles:true,standardRoles:true});
    db.user.count.mockResolvedValue(1);
    db.userInvitation.count.mockResolvedValue(0);
    db.user.findUnique.mockResolvedValue(null);
    db.userInvitation.findFirst.mockResolvedValue(null);
    return db;
  };

  const mail:any={sendUserInvitation:jest.fn().mockResolvedValue({sent:true})};
  const sessions:any={};

  it('revalidates the active custom profile inside the serializable transaction',async()=>{
    const db=makeDb();
    db.accessProfile.findFirst.mockResolvedValue({id:'profile-1',tenantId:'t1',name:'Operação',active:true});
    db.userInvitation.create.mockResolvedValue({
      id:'inv-1',name:'Maria',email:'maria@example.com',role:'admin',
      customProfileId:'profile-1',customProfile:{id:'profile-1',name:'Operação'},
      status:'pending',expiresAt:new Date(),createdAt:new Date(),
    });
    const service=new AccessManagementService(db,mail,sessions);

    await service.createUser('t1',{
      name:'Maria',email:'maria@example.com',role:'admin',customProfileId:'profile-1',
    } as any,'owner');

    expect(db.accessProfile.findFirst).toHaveBeenCalledWith({
      where:{id:'profile-1',tenantId:'t1',active:true},
    });
    expect(db.userInvitation.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({customProfileId:'profile-1',role:'admin'}),
    }));
  });

  it('blocks the invitation if the profile became inactive before the transaction reads it',async()=>{
    const db=makeDb();
    db.accessProfile.findFirst.mockResolvedValue(null);
    const service=new AccessManagementService(db,mail,sessions);

    await expect(service.createUser('t1',{
      name:'Maria',email:'maria@example.com',role:'admin',customProfileId:'profile-1',
    } as any,'owner')).rejects.toBeInstanceOf(BadRequestException);

    expect(db.userInvitation.create).not.toHaveBeenCalled();
    expect(mail.sendUserInvitation).not.toHaveBeenCalled();
  });

  it('revalidates the custom profile again after a P2034 retry',async()=>{
    const db=makeDb();
    let calls=0;
    db.$transaction.mockImplementation(async(callback:any,options:any)=>{
      expect(options).toEqual({isolationLevel:'Serializable'});
      calls++;
      if(calls===1)throw {code:'P2034'};
      return callback(db);
    });
    db.accessProfile.findFirst.mockResolvedValue({id:'profile-1',tenantId:'t1',name:'Operação',active:true});
    db.userInvitation.create.mockResolvedValue({
      id:'inv-1',name:'Maria',email:'maria@example.com',role:'admin',
      customProfileId:'profile-1',customProfile:{id:'profile-1',name:'Operação'},
      status:'pending',expiresAt:new Date(),createdAt:new Date(),
    });
    const service=new AccessManagementService(db,mail,sessions);

    await expect(service.createUser('t1',{
      name:'Maria',email:'maria@example.com',role:'admin',customProfileId:'profile-1',
    } as any,'owner')).resolves.toEqual(expect.objectContaining({id:'inv-1'}));

    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(db.accessProfile.findFirst).toHaveBeenCalledTimes(1);
  });
});
