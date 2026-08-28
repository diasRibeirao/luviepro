import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AccountService } from './account.service';

describe('AccountService', () => {
  it('counts pending invitations as occupied user seats without changing the active user count', async () => {
    const db: any = {
      planLimit: {
        findUnique: jest.fn().mockResolvedValue({
          plan: 'pro',
          maxClients: 10,
          maxQuotesPerMonth: 10,
          maxUsers: 3,
        }),
      },
      client: { count: jest.fn().mockResolvedValue(2) },
      quote: { count: jest.fn().mockResolvedValue(1) },
      user: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      userInvitation: { count: jest.fn().mockResolvedValue(1) },
    };
    const subscriptions: any = {
      activateScheduledIfDue: jest.fn().mockResolvedValue({ id: 't1', plan: 'pro' }),
    };

    const result = await new AccountService(db, subscriptions).account('t1');

    expect(result.usage.users).toBe(1);
    expect(result.usage.pendingInvitations).toBe(1);
    expect(result.usage.userSeatsUsed).toBe(2);
    expect(result.entitlements.remaining.users).toBe(1);
  });

  it('keeps direct plan changes gated', async () => {
    const old = process.env.ALLOW_DIRECT_PLAN_CHANGE;
    delete process.env.ALLOW_DIRECT_PLAN_CHANGE;
    const db: any = {
      planLimit: { findUnique: jest.fn().mockResolvedValue({ maxUsers: 3 }) },
      user: { count: jest.fn().mockResolvedValue(1) },
      userInvitation: { count: jest.fn().mockResolvedValue(0) },
    };

    await expect(
      new AccountService(db, {} as any).updatePlan('t1', 'pro', 'monthly'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    if (old === undefined) delete process.env.ALLOW_DIRECT_PLAN_CHANGE;
    else process.env.ALLOW_DIRECT_PLAN_CHANGE = old;
  });

  it('rejects a configured plan that is unavailable', async () => {
    const db: any = {
      planLimit: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    await expect(
      new AccountService(db, {} as any).updatePlan('t1', 'pro', 'monthly'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not hide database failures while removing a logo', async () => {
    const failure = new Error('database unavailable');
    const db: any = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 't1' }),
        update: jest.fn().mockRejectedValue(failure),
      },
    };

    await expect(
      new AccountService(db, {} as any).removeLogo('t1', 'u1'),
    ).rejects.toBe(failure);
  });

  it('reports a missing account while removing a logo', async () => {
    const db: any = {
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    await expect(
      new AccountService(db, {} as any).removeLogo('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes sessions and audits password changes as a user event', async () => {
    const passwordHash = await hash('CurrentPassword123!', 4);
    const tx = {
      user: { update: jest.fn().mockResolvedValue({}) },
      authSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const db: any = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', passwordHash }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    await expect(
      new AccountService(db, {} as any).changePassword(
        't1',
        'u1',
        'CurrentPassword123!',
        'NewPassword123!',
      ),
    ).resolves.toEqual({ ok: true });

    expect(tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', tenantId: 't1', revokedAt: null },
      data: expect.objectContaining({ revokedReason: 'password_changed' }),
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'change_password',
        entity: 'user',
        entityId: 'u1',
      }),
    });
  });

  it('rejects an incorrect current password without updating the user', async () => {
    const db: any = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'u1',
          passwordHash: await hash('CurrentPassword123!', 4),
        }),
      },
      $transaction: jest.fn(),
    };

    await expect(
      new AccountService(db, {} as any).changePassword(
        't1',
        'u1',
        'WrongPassword123!',
        'NewPassword123!',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
