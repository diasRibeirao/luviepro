import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AccessManagementService } from './access-management.service';

describe('AccessManagementService',()=>{
  const db:any={
    tenant:{findUnique:jest.fn()},planLimit:{findUnique:jest.fn()},
    user:{findMany:jest.fn(),findUnique:jest.fn(),findFirst:jest.fn(),count:jest.fn(),create:jest.fn(),update:jest.fn()},
    userInvitation:{findMany:jest.fn(),findUnique:jest.fn(),findFirst:jest.fn(),count:jest.fn(),create:jest.fn(),update:jest.fn(),updateMany:jest.fn()},
    accessProfile:{findMany:jest.fn(),findFirst:jest.fn(),create:jest.fn(),update:jest.fn()},
    authSession:{updateMany:jest.fn()},auditLog:{create:jest.fn()},
    $transaction:jest.fn(),
  };
  const mail:any={sendUserInvitation:jest.fn()};
  const sessions:any={issueTenant:jest.fn()};
  let service:AccessManagementService;
  beforeEach(()=>{jest.clearAllMocks();db.$transaction.mockImplementation(async(fn:any)=>fn(db));db.auditLog.create.mockResolvedValue({});service=new AccessManagementService(db,mail,sessions);});

  it('scopes user listing to the tenant',async()=>{db.user.findMany.mockResolvedValue([]);await service.users('tenant-a');expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant-a'}}));});
  it('blocks custom profiles outside Business entitlement',async()=>{db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'pro'});db.planLimit.findUnique.mockResolvedValue({customRoles:false});await expect(service.accessProfiles('t1')).rejects.toBeInstanceOf(ForbiddenException);});
  it('counts pending invitations as occupied seats',async()=>{db.tenant.findUnique.mockResolvedValue({id:'t1',plan:'pro',name:'T'});db.planLimit.findUnique.mockResolvedValue({maxUsers:3,standardRoles:true});db.user.count.mockResolvedValue(2);db.userInvitation.count.mockResolvedValue(1);await expect(service.createUser('t1',{name:'N',email:'n@example.com',role:'admin'},'owner')).rejects.toBeInstanceOf(BadRequestException);});
  it('revokes active sessions when a user is deactivated',async()=>{db.user.findFirst.mockResolvedValue({id:'u2',tenantId:'t1',role:'admin',active:true});db.user.update.mockResolvedValue({id:'u2',role:'admin',customProfileId:null,active:false});db.authSession.updateMany.mockResolvedValue({count:2});await service.updateUser('t1','u2',{active:false},'owner');expect(db.authSession.updateMany).toHaveBeenCalledWith({where:{userId:'u2',tenantId:'t1',revokedAt:null},data:expect.objectContaining({revokedReason:'user_deactivated'})});});
});
