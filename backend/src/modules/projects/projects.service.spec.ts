import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const db: any = {
    projectStatus: { count: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    project: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    projectTask: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    projectNote: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    service = new ProjectsService(db);
  });

  it('scopes projects to tenant', async () => {
    db.project.findMany.mockResolvedValue([]);
    await service.projects('t1');
    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 't1' } }));
  });

  it('rejects project lookup from another tenant', async () => {
    db.project.findFirst.mockResolvedValue(null);
    await expect(service.project('tenant-a', 'p-foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p-foreign', tenantId: 'tenant-a' } }));
  });

  it('recalculates project progress after task completion', async () => {
    db.projectTask.findFirst.mockResolvedValue({ id: 'task', projectId: 'p1', tenantId: 't1', title: 'T', status: 'pending', priority: 'medium', dueDate: null, completedAt: null });
    db.projectTask.update.mockResolvedValue({ id: 'task', status: 'completed' });
    db.projectTask.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    db.project.update.mockResolvedValue({});
    await service.updateProjectTask('t1', 'p1', 'task', { status: 'completed' }, 'u1');
    expect(db.project.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { progress: 100, status: 'completed' } });
  });

  it('blocks disabling a project status while projects still use it', async () => {
    db.projectStatus.findFirst.mockResolvedValue({ id: 's1', tenantId: 't1', key: 'scheduled', name: 'Agendados', color: '#fff', position: 0, active: true });
    db.project.count.mockResolvedValue(2);
    await expect(service.updateProjectStatus('t1', 's1', { active: false }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.projectStatus.update).not.toHaveBeenCalled();
  });
});
