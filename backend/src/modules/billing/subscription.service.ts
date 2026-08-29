import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type CurrentTenantSnapshot = {
  id: string;
  plan: string;
  status?: string;
  subscriptionExpiresAt?: Date | null;
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly db: PrismaService) {}

  async activateScheduledIfDue<T extends CurrentTenantSnapshot>(tenantId: string, currentTenant?: T | null) {
    if (!tenantId) throw new BadRequestException('Contexto da empresa ausente');
    const now = new Date();
    const scheduled = await this.db.subscription.findFirst({
      where: { tenantId, status: 'scheduled', startsAt: { lte: now } },
      orderBy: { startsAt: 'asc' },
    });
    if (!scheduled) return currentTenant ?? this.db.tenant.findUnique({ where: { id: tenantId } });

    return this.db.$transaction(async (tx) => {
      const claimed = await tx.subscription.updateMany({
        where: { id: scheduled.id, tenantId, status: 'scheduled', startsAt: { lte: now } },
        data: { status: 'active' },
      });
      if (!claimed.count) return tx.tenant.findUnique({ where: { id: tenantId } });

      await tx.subscription.updateMany({
        where: { tenantId, id: { not: scheduled.id }, status: { in: ['active', 'trial'] } },
        data: { status: 'replaced' },
      });
      await tx.subscription.updateMany({
        where: { tenantId, id: { not: scheduled.id }, status: 'scheduled' },
        data: { status: 'cancelled' },
      });
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

  async reconcileExpiredBatch(batchSize = 100) {
    const now = new Date();
    const take = Math.max(1, Math.min(500, Math.trunc(batchSize)));
    const tenants = await this.db.tenant.findMany({
      where: { status: 'active', subscriptionExpiresAt: { lte: now } },
      select: { id: true, plan: true, status: true, subscriptionExpiresAt: true },
      orderBy: { subscriptionExpiresAt: 'asc' },
      take,
    });

    let expired = 0;
    let activatedScheduled = 0;
    for (const tenant of tenants) {
      const effective = await this.activateScheduledIfDue(tenant.id);
      if (effective?.subscriptionExpiresAt && effective.subscriptionExpiresAt.getTime() > now.getTime()) {
        if (effective.status === 'active') activatedScheduled++;
        continue;
      }
      const changed = await this.db.$transaction(async tx => {
        const claimed = await tx.tenant.updateMany({
          where: { id: tenant.id, status: 'active', subscriptionExpiresAt: { lte: now } },
          data: { status: 'expired' },
        });
        if (!claimed.count) return false;
        await tx.subscription.updateMany({
          where: { tenantId: tenant.id, status: { in: ['active', 'trial'] }, expiresAt: { lte: now } },
          data: { status: 'expired' },
        });
        return true;
      });
      if (changed) expired++;
    }
    return { scanned: tenants.length, expired, activatedScheduled };
  }
}
