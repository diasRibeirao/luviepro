import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly db: PrismaService) {}

  private audit(tenantId: string, actorUserId: string | undefined, action: string, entity: string, entityId?: string, metadata?: any) {
    return this.db.auditLog.create({ data: { tenantId, actorUserId, action, entity, entityId, metadata } });
  }

  list(tenantId: string) {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 6);
    return this.db.calendarEvent.findMany({ where: { tenantId, startAt: { gte: from, lte: to } }, orderBy: { startAt: 'asc' } });
  }

  async create(tenantId: string, userId: string, data: CalendarEventDto) {
    const startAt = new Date(data.startAt);
    const endAt = data.endAt ? new Date(data.endAt) : null;
    this.validateDates(startAt, endAt);
    await this.validateRelations(tenantId, data.clientId, data.projectId);
    const event = await this.db.calendarEvent.create({
      data: {
        tenantId,
        createdById: userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        startAt,
        endAt,
        allDay: !!data.allDay,
        location: data.location?.trim() || null,
        recurrence: data.recurrence ?? 'none',
        reminderMinutes: data.reminderMinutes ?? 60,
        clientId: data.clientId || null,
        projectId: data.projectId || null,
      },
    });
    await this.audit(tenantId, userId, 'create', 'calendar_event', event.id, { title: event.title, startAt: event.startAt });
    return event;
  }

  async cancel(tenantId: string, id: string, userId: string) {
    const event = await this.db.calendarEvent.findFirst({ where: { id, tenantId } });
    if (!event) throw new NotFoundException('Compromisso não encontrado');
    const updated = await this.db.calendarEvent.update({ where: { id }, data: { status: 'cancelled' } });
    await this.audit(tenantId, userId, 'cancel', 'calendar_event', id, { title: event.title });
    return updated;
  }

  async update(tenantId: string, id: string, userId: string, data: UpdateCalendarEventDto) {
    const event = await this.db.calendarEvent.findFirst({ where: { id, tenantId } });
    if (!event) throw new NotFoundException('Compromisso não encontrado');
    const startAt = data.startAt === undefined ? event.startAt : new Date(data.startAt);
    const endAt = data.endAt === undefined ? event.endAt : (data.endAt ? new Date(data.endAt) : null);
    this.validateDates(startAt, endAt);
    await this.validateRelations(tenantId, data.clientId, data.projectId);
    const updated = await this.db.calendarEvent.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.startAt !== undefined ? { startAt } : {}),
        ...(data.endAt !== undefined ? { endAt } : {}),
        ...(data.allDay !== undefined ? { allDay: data.allDay } : {}),
        ...(data.location !== undefined ? { location: data.location?.trim() || null } : {}),
        ...(data.recurrence !== undefined ? { recurrence: data.recurrence } : {}),
        ...(data.reminderMinutes !== undefined ? { reminderMinutes: data.reminderMinutes } : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId || null } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    await this.audit(tenantId, userId, 'update', 'calendar_event', id, { title: updated.title, startAt: updated.startAt });
    return updated;
  }

  private validateDates(startAt: Date, endAt: Date | null) {
    if (Number.isNaN(startAt.getTime()) || (endAt && Number.isNaN(endAt.getTime()))) throw new BadRequestException('Data do compromisso inválida');
    if (endAt && endAt < startAt) throw new BadRequestException('O término deve ser posterior ao início');
  }

  private async validateRelations(tenantId: string, clientId?: string, projectId?: string) {
    if (clientId && !await this.db.client.findFirst({ where: { id: clientId, tenantId } })) throw new NotFoundException('Cliente não encontrado');
    if (projectId && !await this.db.project.findFirst({ where: { id: projectId, tenantId } })) throw new NotFoundException('Projeto não encontrado');
  }
}
