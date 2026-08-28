import { readFileSync } from 'fs';
import { resolve } from 'path';

const read=(file:string)=>readFileSync(resolve(process.cwd(),'src',file),'utf8');

describe('NestJS domain module architecture',()=>{
  it.each([
    ['modules/auth/auth.module.ts','AuthModule'],
    ['modules/billing/billing.module.ts','BillingModule'],
    ['modules/access/access.module.ts','AccessModule'],
    ['modules/quotes/quotes.module.ts','QuotesModule'],
    ['modules/projects/projects.module.ts','ProjectsModule'],
    ['modules/notifications/notifications.module.ts','NotificationsModule'],
    ['modules/core/core.module.ts','CoreModule'],
    ['modules/clients/clients.module.ts','ClientsModule'],
    ['modules/services/services.module.ts','ServicesModule'],
  ])('%s declares %s',(file,name)=>{
    expect(read(file)).toContain(`export class ${name}`);
    expect(read(file)).toContain('@Module(');
  });

  it('keeps infrastructure in a global CoreModule',()=>{
    const source=read('modules/core/core.module.ts');
    expect(source).toContain('@Global()');
    expect(source).toContain('PrismaService');
    expect(source).toContain('RedisService');
    expect(source).toContain('MailService');
  });

  it('AppModule composes domain modules instead of their internal services',()=>{
    const source=read('app.module.ts');
    for(const name of ['AuthModule','BillingModule','NotificationsModule','AccessModule','ProjectsModule','QuotesModule','ClientsModule','ServicesModule'])expect(source).toContain(name);
    for(const implementation of ['AuthService','AuthSessionService','BillingService','SubscriptionService','NotificationsService','AccessManagementService','ProjectsCalendarService','QuotesService','ClientsService','ServicesService'])expect(source).not.toContain(`import { ${implementation} }`);
  });
});
