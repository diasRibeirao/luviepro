import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class DashboardService {
  constructor(private db: PrismaService, private finance: FinanceService) {}

  async overview(tenantId: string, userId?: string) {
    const [finance, obligations] = await Promise.all([
      this.finance.summary(tenantId),
      this.finance.obligations(tenantId),
    ]);
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [clients, quotes, projects, revenue, totalQuotes, approvedQuotes, draftQuotes, sentQuotes, rejectedQuotes, openValue, expiringQuotes, currentMonthClients, previousMonthClients, currentMonthQuotes, previousMonthQuotes, currentMonthRevenue, previousMonthRevenue, overdueProjects, auditRows] = await Promise.all([
      this.db.client.count({ where: { tenantId, active: true } }),
      this.db.quote.findMany({ where: { tenantId }, include: { client: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.db.project.findMany({ where: { tenantId, status: { in: ['scheduled', 'in_progress'] } }, include: { client: true, tasks: { where: { tenantId, status: { not: 'completed' } }, orderBy: { dueDate: 'asc' } } }, orderBy: [{ progress: 'desc' }, { name: 'asc' }] }),
      this.db.quote.aggregate({ where: { tenantId, status: 'approved' }, _sum: { finalTotalCents: true } }),
      this.db.quote.count({ where: { tenantId } }),
      this.db.quote.count({ where: { tenantId, status: 'approved' } }),
      this.db.quote.count({ where: { tenantId, status: 'draft' } }),
      this.db.quote.count({ where: { tenantId, status: 'sent' } }),
      this.db.quote.count({ where: { tenantId, status: 'rejected' } }),
      this.db.quote.aggregate({ where: { tenantId, status: { in: ['draft', 'sent'] } }, _sum: { finalTotalCents: true } }),
      this.db.quote.findMany({ where: { tenantId, status: 'sent', clientDecision: null, validUntil: { gte: now, lte: soon } }, include: { client: true }, orderBy: { validUntil: 'asc' }, take: 5 }),
      this.db.client.count({ where: { tenantId, createdAt: { gte: monthStart, lt: nextMonthStart } } }),
      this.db.client.count({ where: { tenantId, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      this.db.quote.count({ where: { tenantId, createdAt: { gte: monthStart, lt: nextMonthStart } } }),
      this.db.quote.count({ where: { tenantId, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      this.db.quote.aggregate({ where: { tenantId, status: 'approved', approvedAt: { gte: monthStart, lt: nextMonthStart } }, _sum: { finalTotalCents: true } }),
      this.db.quote.aggregate({ where: { tenantId, status: 'approved', approvedAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { finalTotalCents: true } }),
      this.db.project.findMany({ where: { tenantId, status: { in: ['scheduled', 'in_progress'] } }, include: { client: true, tasks: { where: { tenantId, status: { not: 'completed' } }, orderBy: { dueDate: 'asc' } } }, orderBy: [{ endDate: 'asc' }, { name: 'asc' }] }),
      this.db.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 12 }),
    ]);

    const actorIds = [...new Set(auditRows.map(x => x.actorUserId).filter((x): x is string => !!x))];
    const actors = actorIds.length ? await this.db.user.findMany({ where: { tenantId, id: { in: actorIds } }, select: { id: true, name: true } }) : [];
    const actorNames = new Map(actors.map(x => [x.id, x.name]));
    const [myTasks, myProjects, myTaskCount, myProjectCount] = userId ? await Promise.all([
      this.db.projectTask.findMany({
        where: { tenantId, assigneeUserId: userId, status: { not: 'completed' } },
        include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
        take: 8,
      }),
      this.db.project.findMany({
        where: { tenantId, assigneeUserId: userId, status: { in: ['scheduled', 'in_progress'] } },
        include: { client: { select: { name: true } } },
        orderBy: [{ endDate: 'asc' }, { name: 'asc' }],
        take: 5,
      }),
      this.db.projectTask.count({ where: { tenantId, assigneeUserId: userId, status: { not: 'completed' } } }),
      this.db.project.count({ where: { tenantId, assigneeUserId: userId, status: { in: ['scheduled', 'in_progress'] } } }),
    ]) : [[], [], 0, 0];
    const routeFor = (entity: string, id?: string | null) => {
      if (!id) return null;
      if (entity === 'project' || entity === 'project_task') return entity === 'project' ? `/projects/${id}` : '/projects';
      if (entity === 'quote') return `/quote/${id}`;
      if (entity === 'client') return '/clients';
      if (entity === 'product') return '/products';
      if (entity === 'purchase_order') return '/purchases';
      if (entity === 'order') return '/orders';
      if (entity === 'financial_entry') return '/finance';
      if (entity === 'service') return '/services';
      return null;
    };

    const delta = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : Math.round((current - previous) * 100 / previous);
    const currentRevenue = currentMonthRevenue._sum.finalTotalCents ?? 0;
    const previousRevenue = previousMonthRevenue._sum.finalTotalCents ?? 0;
    const overdue = overdueProjects.filter((project: any) => (project.endDate && new Date(project.endDate) < startOfToday) || project.tasks?.some((task: any) => task.dueDate && new Date(task.dueDate) < startOfToday)).map((project: any) => ({ ...project, tasks: (project.tasks ?? []).filter((task: any) => task.dueDate && new Date(task.dueDate) < startOfToday) })).slice(0, 5);
    const overdueFinance = obligations.filter((x: any) => x.dueAt && new Date(x.dueAt) < startOfToday).slice(0, 8);
    const priorityCount = overdue.length + expiringQuotes.length + overdueFinance.length;

    return {
      clients, quotes, projects, finance,
      approvedRevenueCents: revenue._sum.finalTotalCents ?? 0,
      openPipelineCents: openValue._sum.finalTotalCents ?? 0,
      totalQuotes, approvedQuotes,
      pipeline: { draft: draftQuotes, sent: sentQuotes, approved: approvedQuotes, rejected: rejectedQuotes },
      expiringQuotes,
      overdueProjects: overdue,
      overdueFinance,
      priorityCount,
      myPending: {
        total: myTaskCount + myProjectCount,
        tasks: myTasks.map(task => ({ id: task.id, title: task.title, priority: task.priority, dueDate: task.dueDate, project: task.project })),
        projects: myProjects.map(project => ({ id: project.id, name: project.name, status: project.status, progress: project.progress, endDate: project.endDate, client: project.client })),
      },
      recentActivity: auditRows.map(row => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        actorName: row.actorUserId ? (actorNames.get(row.actorUserId) ?? 'Usuário') : 'Sistema/cliente',
        createdAt: row.createdAt,
        route: routeFor(row.entity, row.entityId),
      })),
      period: {
        currentMonth: { clients: currentMonthClients, quotes: currentMonthQuotes, approvedRevenueCents: currentRevenue },
        previousMonth: { clients: previousMonthClients, quotes: previousMonthQuotes, approvedRevenueCents: previousRevenue },
        delta: { clients: delta(currentMonthClients, previousMonthClients), quotes: delta(currentMonthQuotes, previousMonthQuotes), approvedRevenue: delta(currentRevenue, previousRevenue) },
      },
    };
  }
}
