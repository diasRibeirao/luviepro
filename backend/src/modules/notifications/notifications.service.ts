import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationPreferencesDto } from './dto/notifications.dto';
import { notificationRoutes } from './types/notification-routes';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PrismaService) {}

  private requireContext(tenantId: string, userId: string) {
    if (!tenantId || !userId) throw new BadRequestException('Contexto da empresa ou usuário ausente');
  }

  private async preferences(tenantId: string, userId: string) {
    this.requireContext(tenantId, userId);
    return this.db.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { tenantId, userId },
    });
  }

  private async sync(tenantId: string, userId: string) {
    const prefs = await this.preferences(tenantId, userId);
    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 86400000);
    const [events, tasks, quotes] = await Promise.all([
      prefs.agendaReminders
        ? this.db.calendarEvent.findMany({ where: { tenantId, status: 'active', startAt: { gte: now, lte: horizon } } })
        : [],
      prefs.taskDeadlines
        ? this.db.projectTask.findMany({ where: { tenantId, status: { not: 'completed' }, dueDate: { gte: now, lte: horizon } }, include: { project: true } })
        : [],
      prefs.quoteExpirations
        ? this.db.quote.findMany({ where: { tenantId, status: 'sent', validUntil: { gte: now, lte: horizon } } })
        : [],
    ]);

    const rows = [
      ...events.map(x => ({
        key: `calendar:${x.id}:${x.startAt.toISOString()}`,
        type: 'agenda',
        title: `Compromisso: ${x.title}`,
        message: `Agendado para ${x.startAt.toLocaleString('pt-BR')}`,
        route: notificationRoutes.calendar,
        entityId: x.id,
      })),
      ...tasks.filter(x => x.dueDate).map(x => ({
        key: `task:${x.id}:${x.dueDate!.toISOString()}`,
        type: 'task_due',
        title: `Prazo: ${x.title}`,
        message: x.project?.name ?? null,
        route: notificationRoutes.project(x.projectId),
        entityId: x.id,
      })),
      ...quotes.filter(x => x.validUntil).map(x => ({
        key: `quote:${x.id}:${x.validUntil!.toISOString()}`,
        type: 'quote_expiring',
        title: `Proposta ${x.number} próxima do vencimento`,
        message: `Válida até ${x.validUntil!.toLocaleDateString('pt-BR')}`,
        route: notificationRoutes.quote(x.id),
        entityId: x.id,
      })),
    ];

    await Promise.all(rows.map(row => this.db.userNotification.upsert({
      where: { userId_key: { userId, key: row.key } },
      update: { title: row.title, message: row.message, route: row.route },
      create: { tenantId, userId, ...row },
    })));
  }

  async list(tenantId: string, userId: string) {
    await this.sync(tenantId, userId);
    return this.db.userNotification.findMany({
      where: { tenantId, userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(tenantId: string, userId: string) {
    await this.sync(tenantId, userId);
    return { count: await this.db.userNotification.count({ where: { tenantId, userId, readAt: null, archivedAt: null } }) };
  }

  async read(tenantId: string, userId: string, id: string) {
    this.requireContext(tenantId, userId);
    const result = await this.db.userNotification.updateMany({ where: { id, tenantId, userId }, data: { readAt: new Date() } });
    if (!result.count) throw new NotFoundException('Notificação não encontrada');
    return { ok: true };
  }

  async readAll(tenantId: string, userId: string) {
    this.requireContext(tenantId, userId);
    await this.db.userNotification.updateMany({ where: { tenantId, userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  preferencesFor(tenantId: string, userId: string) {
    return this.preferences(tenantId, userId);
  }

  updatePreferences(tenantId: string, userId: string, data: NotificationPreferencesDto) {
    this.requireContext(tenantId, userId);
    return this.db.notificationPreference.upsert({ where: { userId }, update: data, create: { tenantId, userId, ...data } });
  }
}
