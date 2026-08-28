import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthSessionService } from './auth-session.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthSessionService persistent sessions', () => {
  const jwt: any = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const subscriptions: any = { activateScheduledIfDue: jest.fn() };
  const db: any = {
    user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    platformAdmin: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    accessProfile: { findFirst: jest.fn() },
    authSession: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: AuthSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    subscriptions.activateScheduledIfDue.mockResolvedValue(null);
    jwt.signAsync.mockImplementation(async (payload: any) => payload.typ === 'refresh' ? 'new-refresh-token' : 'new-access-token');
    db.authSession.create.mockResolvedValue({});
    db.authSession.updateMany.mockResolvedValue({ count: 1 });
    db.user.update.mockResolvedValue({});
    db.user.updateMany.mockResolvedValue({ count: 1 });
    db.platformAdmin.update.mockResolvedValue({});
    db.platformAdmin.updateMany.mockResolvedValue({ count: 1 });
    db.$transaction.mockImplementation(async (fn: any) => fn(db));
    service = new AuthSessionService(db, jwt, subscriptions);
  });

  it('creates a persistent session when issuing a tenant login', async () => {
    const user = { id: 'u1', tenantId: 't1', name: 'User', email: 'u@example.com', role: 'owner', customProfileId: null, tenant: { id: 't1', plan: 'pro', status: 'active' } };
    const result = await service.issueTenant(user);
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(db.authSession.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', tenantId: 't1', refreshTokenHash: sha256('new-refresh-token') }) }));
  });


  it('permite emitir sessão para conta expirada somente para posterior controle pelo guard', async () => {
    const user = { id: 'u1', tenantId: 't1', name: 'User', email: 'u@example.com', role: 'owner', customProfileId: null, tenant: { id: 't1', plan: 'pro', status: 'expired', subscriptionExpiresAt: new Date(Date.now() - 60_000) } };
    await expect(service.issueTenant(user)).resolves.toEqual(expect.objectContaining({ token: 'new-access-token', refreshToken: 'new-refresh-token' }));
  });

  it('rejects legacy refresh tokens without a persistent session id', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 't1', role: 'owner', typ: 'refresh' });
    await expect(service.refresh('legacy-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.authSession.findUnique).not.toHaveBeenCalled();
  });

  it('rotates a refresh token and preserves its session family', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 't1', role: 'owner', typ: 'refresh', sid: 'old-session', fid: 'family-1' });
    db.authSession.findUnique.mockResolvedValue({ id: 'old-session', familyId: 'family-1', userId: 'u1', platformAdminId: null, tenantId: 't1', refreshTokenHash: sha256('old-refresh'), expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    db.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: 't1', name: 'User', email: 'u@example.com', role: 'owner', active: true, customProfileId: null, tenant: { id: 't1', plan: 'pro', status: 'active', subscriptionExpiresAt: new Date(Date.now() + 60_000) } });

    const result = await service.refresh('old-refresh');

    expect(result.refreshToken).toBe('new-refresh-token');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'old-session', revokedAt: null }), data: expect.objectContaining({ revokedReason: 'rotated' }) }));
    expect(db.authSession.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ familyId: 'family-1', userId: 'u1', tenantId: 't1' }) }));
  });

  it('revokes the active family when an already rotated refresh token is reused', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 't1', typ: 'refresh', sid: 'old-session', fid: 'family-1' });
    db.authSession.findUnique.mockResolvedValue({ id: 'old-session', familyId: 'family-1', userId: 'u1', tenantId: 't1', refreshTokenHash: sha256('old-refresh'), expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() });

    await expect(service.refresh('old-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.authSession.updateMany).toHaveBeenCalledWith({ where: { familyId: 'family-1', revokedAt: null }, data: expect.objectContaining({ revokedReason: 'refresh_reuse_detected' }) });
  });

  it('rejects a session whose stored tenant does not match the token tenant', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 'tenant-b', typ: 'refresh', sid: 's1', fid: 'f1' });
    db.authSession.findUnique.mockResolvedValue({ id: 's1', familyId: 'f1', userId: 'u1', platformAdminId: null, tenantId: 'tenant-a', refreshTokenHash: sha256('token'), expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    db.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: 'tenant-a', active: true, tenant: { status: 'active' } });
    await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.authSession.updateMany).toHaveBeenCalledWith({ where: { familyId: 'f1', revokedAt: null }, data: expect.objectContaining({ revokedReason: 'principal_mismatch' }) });
  });

  it('logs out only the current tenant session when a sid is available', async () => {
    await service.revokeTenant('u1', 't1', 'session-1');
    expect(db.authSession.updateMany).toHaveBeenCalledWith({ where: { id: 'session-1', userId: 'u1', tenantId: 't1', revokedAt: null }, data: expect.objectContaining({ revokedReason: 'logout' }) });
  });

  it('revokes all user sessions for a security reset', async () => {
    await service.revokeAllForUser('u1', 'password_reset');
    expect(db.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', revokedAt: null }, data: expect.objectContaining({ revokedReason: 'password_reset' }) });
  });
});
