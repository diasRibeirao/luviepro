import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationPreferencesDto } from './dto/notifications.dto';
import { notificationRoutes } from './types/notification-routes';
import { MailService } from '../../mail.service';
import { RedisService } from '../../redis.service';

@Injectable()
export class NotificationsService implements OnModuleInit,OnModuleDestroy {
  private emailTimer?:NodeJS.Timeout;
  private emailCycleRunning=false;
  constructor(private readonly db: PrismaService,@Optional() private readonly mail?:MailService,@Optional() private readonly redis?:RedisService) {}

  onModuleInit(){if(process.env.NOTIFICATION_EMAIL_WORKER_ENABLED!=='true'||!this.mail)return;const interval=Math.max(60000,Number(process.env.NOTIFICATION_EMAIL_WORKER_INTERVAL_MS||300000));this.emailTimer=setInterval(()=>void this.runEmailCycle(),interval);this.emailTimer.unref?.();setTimeout(()=>void this.runEmailCycle(),10000).unref?.();}
  onModuleDestroy(){if(this.emailTimer)clearInterval(this.emailTimer);}

  async runEmailCycle(){
    if(this.emailCycleRunning)return {processed:0,sent:0};
    this.emailCycleRunning=true;
    try{return await this.runEmailCycleUnlocked();}finally{this.emailCycleRunning=false;}
  }

  private async runEmailCycleUnlocked(){if(!this.mail)return {processed:0,sent:0};const execute=async()=>{const prefs=await this.db.notificationPreference.findMany({where:{emailEnabled:true},select:{tenantId:true,userId:true},take:200});let sent=0;for(const pref of prefs){await this.sync(pref.tenantId,pref.userId);const user=await this.db.user.findFirst({where:{id:pref.userId,tenantId:pref.tenantId,active:true},select:{name:true,email:true}});if(!user)continue;const pending=await this.db.userNotification.findMany({where:{tenantId:pref.tenantId,userId:pref.userId,archivedAt:null,emailSentAt:null},orderBy:{createdAt:'asc'},take:20});for(const item of pending){const base=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');const url=item.route?`${base}${item.route.startsWith('/')?'':'/'}${item.route}`:base;const delivery=await this.mail!.sendNotification({to:user.email,name:user.name,title:item.title,message:item.message,url});if(delivery.sent){await this.db.userNotification.updateMany({where:{id:item.id,tenantId:pref.tenantId,userId:pref.userId,emailSentAt:null},data:{emailSentAt:new Date()}});sent++;}}}return {processed:prefs.length,sent};};if(!this.redis)return execute();const interval=Math.max(60000,Number(process.env.NOTIFICATION_EMAIL_WORKER_INTERVAL_MS||300000));const lock=await this.redis.withWorkerLock('notifications:email-worker',Math.max(3600000,interval*2),execute);return lock.acquired?(lock.value??{processed:0,sent:0}):{processed:0,sent:0};}

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
    const [events, tasks, projects, quotes] = await Promise.all([
      prefs.agendaReminders
        ? this.db.calendarEvent.findMany({ where: { tenantId, status: 'active', startAt: { gte: now, lte: horizon } } })
        : [],
      prefs.taskDeadlines
        ? this.db.projectTask.findMany({ where: { tenantId, assigneeUserId: userId, status: { not: 'completed' }, dueDate: { lte: horizon } }, include: { project: true }, orderBy: { dueDate: 'asc' }, take: 50 })
        : [],
      prefs.projectDeadlines
        ? this.db.project.findMany({ where: { tenantId, assigneeUserId: userId, status: { in: ['scheduled', 'in_progress'] }, endDate: { lte: horizon } }, include: { client: true }, orderBy: { endDate: 'asc' }, take: 30 })
        : [],
      prefs.quoteExpirations
        ? this.db.quote.findMany({ where: { tenantId, status: 'sent', validUntil: { gte: now, lte: horizon } } })
        : [],
    ]);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
        title: x.dueDate! < startOfToday ? `Tarefa atrasada: ${x.title}` : `Prazo: ${x.title}`,
        message: x.project?.name ?? null,
        route: notificationRoutes.project(x.projectId),
        entityId: x.id,
      })),
      ...projects.filter(x => x.endDate).map(x => ({
        key: `project:${x.id}:${x.endDate!.toISOString()}`,
        type: 'project_due',
        title: x.endDate! < startOfToday ? `Projeto atrasado: ${x.name}` : `Prazo do projeto: ${x.name}`,
        message: x.client?.name ? `${x.client.name} · ${x.endDate!.toLocaleDateString('pt-BR')}` : x.endDate!.toLocaleDateString('pt-BR'),
        route: notificationRoutes.project(x.id),
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

  async updatePreferences(tenantId: string, userId: string, data: NotificationPreferencesDto) {
    this.requireContext(tenantId, userId);
    const current=await this.preferences(tenantId,userId);
    if(data.emailEnabled===true&&!current.emailEnabled)await this.db.userNotification.updateMany({where:{tenantId,userId,emailSentAt:null},data:{emailSentAt:new Date()}});
    return this.db.notificationPreference.upsert({ where: { userId }, update: data, create: { tenantId, userId, ...data } });
  }
}
