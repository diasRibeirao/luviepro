import { UnauthorizedException } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService session management', () => {
  const jwt:any = {};
  const subscriptions:any = {};
  const base = {
    id: 's1', familyId: 'f1', createdAt: new Date('2026-08-27T10:00:00Z'),
    updatedAt: new Date('2026-08-27T10:00:00Z'), lastUsedAt: null,
    expiresAt: new Date('2099-01-01T00:00:00Z'), revokedAt: null, revokedReason: null,
  };

  it('lists only sessions belonging to the tenant user and marks the current session', async () => {
    const db:any = { authSession: { findMany: jest.fn().mockResolvedValue([base]) } };
    const service = new AuthSessionService(db, jwt, subscriptions);
    const result = await service.listTenantSessions('u1', 't1', 's1');
    expect(db.authSession.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{userId:'u1',tenantId:'t1'}}));
    expect(result[0]).toMatchObject({id:'s1',current:true,active:true});
    expect(result[0]).not.toHaveProperty('familyId');
  });

  it('revokes a session only when id, user and tenant match', async () => {
    const db:any = { authSession: { updateMany: jest.fn().mockResolvedValue({count:1}) } };
    const service = new AuthSessionService(db, jwt, subscriptions);
    await expect(service.revokeTenantSession('u1','t1','s2')).resolves.toEqual({ok:true});
    expect(db.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{id:'s2',userId:'u1',tenantId:'t1',revokedAt:null},
    }));
  });

  it('does not leak whether another tenant owns a session id', async () => {
    const db:any = { authSession: { updateMany: jest.fn().mockResolvedValue({count:0}) } };
    const service = new AuthSessionService(db, jwt, subscriptions);
    await expect(service.revokeTenantSession('u1','t1','foreign')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes other sessions but preserves the current sid', async () => {
    const db:any = { authSession: { updateMany: jest.fn().mockResolvedValue({count:3}) } };
    const service = new AuthSessionService(db, jwt, subscriptions);
    await expect(service.revokeOtherTenantSessions('u1','t1','current')).resolves.toEqual({ok:true,revoked:3});
    expect(db.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{userId:'u1',tenantId:'t1',revokedAt:null,id:{not:'current'}},
    }));
  });

  it('cleans only old expired or revoked sessions', async () => {
    const db:any = { authSession: { deleteMany: jest.fn().mockResolvedValue({count:7}) } };
    const service = new AuthSessionService(db, jwt, subscriptions);
    await expect(service.cleanupExpired(30)).resolves.toEqual({deleted:7});
    expect(db.authSession.deleteMany).toHaveBeenCalledWith({where:{OR:[
      {expiresAt:{lt:expect.any(Date)}},{revokedAt:{lt:expect.any(Date)}}
    ]}});
  });
});
