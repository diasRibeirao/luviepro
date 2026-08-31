import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { auditMetadata, type AuditMetadata } from '../../observability/audit-metadata';
import { clampInteger, nullableTrimmed } from '../../validation/patch';
import { parseDateOrThrow } from '../../validation/dates';
import { CreateProjectStatusDto, CreateProjectTaskDto, UpdateProjectDto, UpdateProjectStatusDto, UpdateProjectTaskDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: PrismaService) {}

  private audit(tenantId: string, actorUserId: string | undefined, action: string, entity: string, entityId?: string, metadata?: AuditMetadata) {
    return this.db.auditLog.create({ data: { tenantId, actorUserId, action, entity, entityId, metadata: auditMetadata(metadata) } });
  }


  private durationDays(value?: string | null) {
    if (!value) return 0;
    const normalized = String(value).trim().replace(',', '.');
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return 0;
    const amount = Number(match[0]);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (/hora|horas|\bh\b/i.test(normalized)) return amount / 8;
    return amount;
  }

  private addCalendarDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private async quotePlanning(tenantId: string, quoteId: string) {
    const items = await this.db.quoteItem.findMany({
      where: { tenantId, quoteId },
      include: { stages: { where: { tenantId }, orderBy: { sequence: 'asc' } } },
      orderBy: { id: 'asc' },
    });
    const totalDays = items.reduce((sum, item) => sum + Math.max(1, item.days || 1), 0);
    return { items, totalDays: Math.max(1, totalDays) };
  }

  private async rescheduleImportedStages(tenantId: string, projectId: string, quoteId: string, startDate: Date) {
    const { items } = await this.quotePlanning(tenantId, quoteId);
    let elapsed = 0;
    for (const item of items) {
      for (const stage of item.stages) {
        const rawDays = this.durationDays(stage.duration);
        const stageDays = Math.max(1, Math.ceil(rawDays || 1));
        const dueDate = this.addCalendarDays(startDate, elapsed + stageDays - 1);
        const title = `${item.serviceName} — ${stage.description}`;
        await this.db.projectTask.updateMany({
          where: { tenantId, projectId, title },
          data: { dueDate },
        });
        elapsed += stageDays;
      }
      if (!item.stages.length) elapsed += Math.max(1, item.days || 1);
    }
  }

  async projectStatuses(tenantId: string) {
    const store = this.db.projectStatus;
    const count = await store.count({ where: { tenantId } });
    if (!count) {
      await store.createMany({
        data: [
          { tenantId, key: 'scheduled', name: 'Agendados', color: '#C9A84C', position: 0 },
          { tenantId, key: 'in_progress', name: 'Em andamento', color: '#2F6B4F', position: 1 },
          { tenantId, key: 'completed', name: 'Concluídos', color: '#6F8C78', position: 2 },
        ],
      });
    }
    return store.findMany({ where: { tenantId }, orderBy: [{ position: 'asc' }, { name: 'asc' }] });
  }

  async createProjectStatus(tenantId: string, data: CreateProjectStatusDto, userId?: string) {
    const store = this.db.projectStatus;
    const key = data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!key) throw new BadRequestException('Nome de status inválido');
    const exists = await store.findUnique({ where: { tenantId_key: { tenantId, key } } });
    if (exists) throw new ConflictException('Já existe um status com este nome');
    const status = await store.create({
      data: {
        tenantId,
        key,
        name: data.name.trim(),
        color: data.color ?? '#2F6B4F',
        position: data.position ?? await store.count({ where: { tenantId } }),
      },
    });
    await this.audit(tenantId, userId, 'create', 'project_status', status.id, { key, name: status.name });
    return status;
  }

  async updateProjectStatus(tenantId: string, id: string, data: UpdateProjectStatusDto, userId?: string) {
    const store = this.db.projectStatus;
    const status = await store.findFirst({ where: { id, tenantId } });
    if (!status) throw new NotFoundException('Status não encontrado');
    if (data.active === false) {
      const inUse = await this.db.project.count({ where: { tenantId, status: status.key } });
      if (inUse) throw new BadRequestException(`Este status possui ${inUse} projeto(s). Mova os projetos antes de desativar.`);
    }
    const updated = await store.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? status.name,
        color: data.color ?? status.color,
        position: data.position ?? status.position,
        active: data.active ?? status.active,
      },
    });
    await this.audit(tenantId, userId, 'update', 'project_status', id, { name: updated.name, active: updated.active });
    return updated;
  }

  async deleteProjectStatus(tenantId: string, id: string, userId?: string) {
    const store = this.db.projectStatus;
    const status = await store.findFirst({ where: { id, tenantId } });
    if (!status) throw new NotFoundException('Status não encontrado');
    const inUse = await this.db.project.count({ where: { tenantId, status: status.key } });
    if (inUse) throw new BadRequestException(`Este status possui ${inUse} projeto(s). Mova os projetos antes de excluir.`);
    await store.delete({ where: { id } });
    await this.audit(tenantId, userId, 'delete', 'project_status', id, { name: status.name });
    return { ok: true };
  }

  projects(tenantId: string) {
    return this.db.project.findMany({
      where: { tenantId },
      include: { client: true, quote: true, tasks: { where: { tenantId }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
  }

  async project(tenantId: string, id: string) {
    const project = await this.db.project.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        quote: { include: { items: { where: { tenantId }, include: { stages: { where: { tenantId }, orderBy: { sequence: 'asc' } } }, orderBy: { id: 'asc' } } } },
        tasks: { where: { tenantId }, orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'asc' }] },
        activityNotes: { where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return project;
  }

  async updateProject(tenantId: string, id: string, data: UpdateProjectDto, actorUserId?: string) {
    const project = await this.db.project.findFirst({ where: { id, tenantId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    const progress = data.progress === undefined ? project.progress : clampInteger(data.progress, 0, 100);
    const status = data.status ?? project.status;
    const normalizedProgress = status === 'completed' ? 100 : progress;
    const nextStartDate = data.startDate ? parseDateOrThrow(data.startDate,'Data inicial') : project.startDate;
    let nextEndDate = data.endDate ? parseDateOrThrow(data.endDate,'Data final') : project.endDate;
    if (data.startDate && data.endDate === undefined && project.quoteId && nextStartDate) {
      const planning = await this.quotePlanning(tenantId, project.quoteId);
      nextEndDate = this.addCalendarDays(nextStartDate, planning.totalDays - 1);
    }
    const updated = await this.db.project.update({
      where: { id },
      data: {
        status,
        progress: normalizedProgress,
        notes: data.notes === undefined ? project.notes : nullableTrimmed(data.notes),
        startDate: nextStartDate,
        endDate: nextEndDate,
      },
      include: { client: true, quote: true, tasks: { where: { tenantId }, orderBy: { createdAt: 'asc' } } },
    });
    if (data.startDate && project.quoteId && nextStartDate) {
      await this.rescheduleImportedStages(tenantId, id, project.quoteId, nextStartDate);
    }
    await this.audit(tenantId, actorUserId, 'update', 'project', id, { status: updated.status, progress: updated.progress, startDate: updated.startDate, endDate: updated.endDate });
    return this.project(tenantId, id);
  }

  async importQuoteStages(tenantId: string, projectId: string, actorUserId?: string) {
    const project = await this.db.project.findFirst({
      where: { id: projectId, tenantId },
      include: { quote: { include: { items: { where: { tenantId }, include: { stages: { where: { tenantId }, orderBy: { sequence: 'asc' } } }, orderBy: { id: 'asc' } } } } },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    if (!project.quote) throw new BadRequestException('Este projeto não possui orçamento vinculado');
    const existing = await this.db.projectTask.findMany({ where: { tenantId, projectId }, select: { title: true } });
    const titles = new Set(existing.map(task => task.title));
    const tasks = project.quote.items.flatMap(item => item.stages.map(stage => ({
      tenantId,
      projectId,
      title: `${item.serviceName} — ${stage.description}`,
      description: `Etapa importada automaticamente do serviço ${item.serviceName}${stage.duration ? ` · Duração prevista: ${stage.duration}` : ''}`,
      priority: 'medium',
    }))).filter(task => !titles.has(task.title));
    if (tasks.length) await this.db.projectTask.createMany({ data: tasks });
    if (project.startDate) await this.rescheduleImportedStages(tenantId, projectId, project.quote.id, project.startDate);
    await this.audit(tenantId, actorUserId, 'import_quote_stages', 'project', projectId, { imported: tasks.length, quoteId: project.quote.id });
    return { ok: true, imported: tasks.length };
  }

  async createProjectNote(tenantId: string, projectId: string, content: string, actorUserId?: string) {
    const project = await this.db.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    const author = actorUserId ? await this.db.user.findFirst({ where: { id: actorUserId, tenantId }, select: { name: true } }) : null;
    const note = await this.db.projectNote.create({ data: { tenantId, projectId, authorUserId: actorUserId, authorName: author?.name, content: content.trim() } });
    await this.audit(tenantId, actorUserId, 'create_note', 'project', projectId, { noteId: note.id });
    return note;
  }

  async createProjectTask(tenantId: string, projectId: string, data: CreateProjectTaskDto, actorUserId?: string) {
    const project = await this.db.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    const task = await this.db.projectTask.create({
      data: {
        tenantId,
        projectId,
        title: data.title.trim(),
        description: data.description,
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate ? parseDateOrThrow(data.dueDate,'Prazo') : undefined,
      },
    });
    await this.audit(tenantId, actorUserId, 'create', 'project_task', task.id, { projectId, title: task.title });
    return task;
  }

  async updateProjectTask(tenantId: string, projectId: string, taskId: string, data: UpdateProjectTaskDto, actorUserId?: string) {
    const task = await this.db.projectTask.findFirst({ where: { id: taskId, projectId, tenantId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    const status = data.status ?? task.status;
    const updated = await this.db.projectTask.update({
      where: { id: taskId },
      data: {
        title: data.title ?? task.title,
        description: data.description ?? task.description,
        status,
        priority: data.priority ?? task.priority,
        dueDate: data.dueDate ? parseDateOrThrow(data.dueDate,'Prazo') : task.dueDate,
        completedAt: status === 'completed' ? (task.completedAt ?? new Date()) : null,
      },
    });
    const [total, done] = await Promise.all([
      this.db.projectTask.count({ where: { projectId, tenantId } }),
      this.db.projectTask.count({ where: { projectId, tenantId, status: 'completed' } }),
    ]);
    if (total > 0) await this.db.project.update({ where: { id: projectId }, data: { progress: Math.round(done * 100 / total), status: done === total ? 'completed' : 'in_progress' } });
    await this.audit(tenantId, actorUserId, 'update', 'project_task', taskId, { projectId, status });
    return updated;
  }
}
