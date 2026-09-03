import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService tenant isolation', () => {
  const baseDb = () => ({
    notificationPreference: { upsert: jest.fn().mockResolvedValue({ agendaReminders:false, projectDeadlines:false, taskDeadlines:false, quoteExpirations:false }) },
    calendarEvent: { findMany: jest.fn() },
    projectTask: { findMany: jest.fn() },
    project: { findMany: jest.fn() },
    quote: { findMany: jest.fn() },
    userNotification: {
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({count:1}),
    },
  });

  it('always scopes list by tenant and user', async () => {
    const db:any=baseDb(); const service=new NotificationsService(db);
    await service.list('tenant-a','user-a');
    expect(db.userNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({tenantId:'tenant-a',userId:'user-a'})}));
  });

  it('cannot mark a notification owned by another tenant/user', async () => {
    const db:any=baseDb(); db.userNotification.updateMany.mockResolvedValue({count:0});
    const service=new NotificationsService(db);
    await expect(service.read('tenant-a','user-a','notification-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.userNotification.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:'notification-b',tenantId:'tenant-a',userId:'user-a'}}));
  });

  it('creates preferences with the authenticated tenant and user', async () => {
    const db:any=baseDb(); const service=new NotificationsService(db);
    await service.preferencesFor('tenant-a','user-a');
    expect(db.notificationPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({create:{tenantId:'tenant-a',userId:'user-a'}}));
  });

  it('persists task notifications with the projects detail route', async () => {
    const db:any=baseDb();
    db.notificationPreference.upsert.mockResolvedValue({ agendaReminders:false, projectDeadlines:false, taskDeadlines:true, quoteExpirations:false });
    db.projectTask.findMany.mockResolvedValue([{
      id:'task-1',
      title:'Entrega',
      projectId:'project-1',
      dueDate:new Date('2026-08-30T12:00:00.000Z'),
      project:{name:'Projeto 1'},
    }]);
    const service=new NotificationsService(db);

    await service.list('tenant-a','user-a');

    expect(db.userNotification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create:expect.objectContaining({route:'/projects/project-1'}),
    }));
  });

  it('only loads task deadlines assigned to the authenticated user', async () => {
    const db:any=baseDb();
    db.notificationPreference.upsert.mockResolvedValue({ agendaReminders:false, projectDeadlines:false, taskDeadlines:true, quoteExpirations:false });
    db.projectTask.findMany.mockResolvedValue([]);
    const service=new NotificationsService(db);

    await service.list('tenant-a','user-a');

    expect(db.projectTask.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({tenantId:'tenant-a',assigneeUserId:'user-a'}),
    }));
  });

  it('creates assigned project deadline notifications', async () => {
    const db:any=baseDb();
    db.notificationPreference.upsert.mockResolvedValue({ agendaReminders:false, projectDeadlines:true, taskDeadlines:false, quoteExpirations:false });
    db.project.findMany.mockResolvedValue([{
      id:'project-1',name:'Projeto 1',endDate:new Date('2026-09-05T12:00:00.000Z'),client:{name:'Cliente 1'},
    }]);
    const service=new NotificationsService(db);

    await service.list('tenant-a','user-a');

    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({tenantId:'tenant-a',assigneeUserId:'user-a'}),
    }));
    expect(db.userNotification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create:expect.objectContaining({type:'project_due',route:'/projects/project-1'}),
    }));
  });

});
