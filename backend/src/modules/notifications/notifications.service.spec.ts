import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService tenant isolation', () => {
  const baseDb = () => ({
    notificationPreference: { upsert: jest.fn().mockResolvedValue({ agendaReminders:false, taskDeadlines:false, quoteExpirations:false }) },
    calendarEvent: { findMany: jest.fn() },
    projectTask: { findMany: jest.fn() },
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
});
