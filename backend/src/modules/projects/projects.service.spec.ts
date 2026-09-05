import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const db: any = {
    projectStatus: { count: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    project: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    projectTask: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    quoteItem: { findMany: jest.fn() },
    calendarEvent: { updateMany: jest.fn() },
    projectNote: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.$transaction.mockImplementation(async (fn:any) => fn(db));
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

  it('calculates project end and stage deadlines in business days and updates the calendar', async () => {
    const project={id:'p1',tenantId:'t1',quoteId:'q1',status:'scheduled',progress:0,notes:null,startDate:null,endDate:null};
    db.project.findFirst.mockResolvedValueOnce(project).mockResolvedValueOnce({id:'p1'});
    db.quoteItem.findMany.mockResolvedValue([{id:'i1',days:3,serviceName:'Organização',stages:[{description:'Etapa 1',duration:'2 dias'},{description:'Etapa 2',duration:'1 dia'}]}]);
    db.project.update.mockResolvedValue({...project,startDate:new Date('2026-09-04T00:00:00'),endDate:new Date('2026-09-08T00:00:00')});
    db.projectTask.updateMany.mockResolvedValue({count:1});
    db.calendarEvent.updateMany.mockResolvedValue({count:1});
    await service.updateProject('t1','p1',{startDate:'2026-09-04'},'u1');
    expect(db.project.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({endDate:new Date('2026-09-08T00:00:00')})}));
    expect(db.projectTask.updateMany).toHaveBeenNthCalledWith(1,expect.objectContaining({data:{dueDate:new Date('2026-09-07T00:00:00')}}));
    expect(db.projectTask.updateMany).toHaveBeenNthCalledWith(2,expect.objectContaining({data:{dueDate:new Date('2026-09-08T00:00:00')}}));
    expect(db.calendarEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'t1',projectId:'p1',status:'active'}}));
  });
});
