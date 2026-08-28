import { ForbiddenException } from '@nestjs/common';
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
});
