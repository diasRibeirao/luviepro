import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const src = (...parts: string[]) => resolve(process.cwd(), 'src', 'modules', ...parts);

describe('Projects and Calendar domain separation', () => {
  it('removes the legacy combined service', () => {
    expect(existsSync(src('projects', 'projects-calendar.service.ts'))).toBe(false);
  });

  it('keeps project and calendar services in independent modules', () => {
    const projects = readFileSync(src('projects', 'projects.module.ts'), 'utf8');
    const calendar = readFileSync(src('calendar', 'calendar.module.ts'), 'utf8');
    expect(projects).toContain('ProjectsService');
    expect(projects).not.toContain('CalendarService');
    expect(calendar).toContain('CalendarService');
    expect(calendar).not.toContain('ProjectsService');
  });

  it('ApiService delegates calendar operations to CalendarService', () => {
    const api = readFileSync(resolve(process.cwd(), 'src', 'api.service.ts'), 'utf8');
    expect(api).toContain('private calendarService()');
    expect(api).toContain('return this.calendarService().list(tenantId)');
    expect(api).toContain('return this.calendarService().create(tenantId,userId,data)');
    expect(api).not.toContain('ProjectsCalendarService');
  });
});
