import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const db: any = {
    client: { findFirst: jest.fn() },
    project: { findFirst: jest.fn(), findMany: jest.fn() },
    calendarEvent: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let service: CalendarService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.auditLog.create.mockResolvedValue({});
    db.project.findMany.mockResolvedValue([]);
    service = new CalendarService(db);
  });

  it('scopes calendar listing to tenant', async () => {
    db.calendarEvent.findMany.mockResolvedValue([]);
    await service.list('t1');
    expect(db.calendarEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1' }) }));
  });

  it('rejects calendar end before start', async () => {
    await expect(service.create('t1', 'u1', { title: 'X', type: 'meeting', startAt: '2026-08-28T12:00:00', endAt: '2026-08-28T11:00:00' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.calendarEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a project from another tenant', async () => {
    db.project.findFirst.mockResolvedValue(null);
    await expect(service.create('t1', 'u1', { title: 'Reunião', type: 'meeting', startAt: '2026-08-28T12:00:00', projectId: 'foreign' })).rejects.toBeInstanceOf(NotFoundException);
    expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', tenantId: 't1' } });
    expect(db.calendarEvent.create).not.toHaveBeenCalled();
  });

  it('creates a calendar event linked to an existing project and client', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1', tenantId: 't1' });
    db.client.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1' });
    db.calendarEvent.create.mockResolvedValue({ id: 'e1', title: 'Projeto Casa', startAt: new Date('2026-09-02T00:00:00') });
    await service.create('t1', 'u1', {
      title: 'Projeto Casa',
      type: 'project',
      startAt: '2026-09-02T00:00:00',
      endAt: '2026-09-10T23:59:59',
      allDay: true,
      projectId: 'p1',
      clientId: 'c1',
    });
    expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', tenantId: 't1' } });
    expect(db.client.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', tenantId: 't1' } });
    expect(db.calendarEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ projectId: 'p1', clientId: 'c1', type: 'project', allDay: true }) }));
  });

  it('updates only fields supplied in a calendar patch', async () => {
    const startAt = new Date('2026-08-28T12:00:00');
    db.calendarEvent.findFirst.mockResolvedValue({ id: 'e1', tenantId: 't1', title: 'Original', startAt, endAt: null });
    db.calendarEvent.update.mockResolvedValue({ id: 'e1', title: 'Novo', startAt });
    await service.update('t1', 'e1', 'u1', { title: 'Novo' });
    expect(db.calendarEvent.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { title: 'Novo' } });
  });
});
