import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { auditMetadata, type AuditMetadata } from '../../observability/audit-metadata';
import { clampInteger, nullableTrimmed } from '../../validation/patch';
import { CreateProjectStatusDto, CreateProjectTaskDto, UpdateProjectDto, UpdateProjectStatusDto, UpdateProjectTaskDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: PrismaService) {}

  private audit(tenantId: string, actorUserId: string | undefined, action: string, entity: string, entityId?: string, metadata?: AuditMetadata) {
    return this.db.auditLog.create({ data: { tenantId, actorUserId, action, entity, entityId, metadata: auditMetadata(metadata) } });
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
        quote: true,
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
    const updated = await this.db.project.update({
      where: { id },
      data: {
        status,
        progress: normalizedProgress,
        notes: data.notes === undefined ? project.notes : nullableTrimmed(data.notes),
        startDate: data.startDate ? new Date(data.startDate) : project.startDate,
        endDate: data.endDate ? new Date(data.endDate) : project.endDate,
      },
      include: { client: true, quote: true, tasks: { where: { tenantId }, orderBy: { createdAt: 'asc' } } },
    });
    await this.audit(tenantId, actorUserId, 'update', 'project', id, { status: updated.status, progress: updated.progress });
    return updated;
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
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
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
        dueDate: data.dueDate ? new Date(data.dueDate) : task.dueDate,
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
