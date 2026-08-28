import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type CurrentTenantSnapshot = {
  id: string;
  plan: string;
  subscriptionExpiresAt?: Date | null;
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly db: PrismaService) {}

  async activateScheduledIfDue<T extends CurrentTenantSnapshot>(tenantId: string, currentTenant?: T | null) {
    const now = new Date();
    const scheduled = await this.db.subscription.findFirst({
      where: { tenantId, status: 'scheduled', startsAt: { lte: now } },
      orderBy: { startsAt: 'asc' },
    });
    if (!scheduled) return currentTenant ?? this.db.tenant.findUnique({ where: { id: tenantId } });

    return this.db.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { tenantId, status: { in: ['active', 'trial'] } },
        data: { status: 'replaced' },
      });
      await tx.subscription.update({ where: { id: scheduled.id }, data: { status: 'active' } });
      return tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan: scheduled.plan,
          planPeriod: scheduled.period,
          subscriptionExpiresAt: scheduled.expiresAt,
          status: 'active',
        },
      });
    });
  }
}
