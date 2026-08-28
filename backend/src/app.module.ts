import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { ApiService } from './api.service';
import { AuthGuard } from './auth.guard';
import { HealthService } from './health.service';
import { TenantActiveGuard } from './tenant-active.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AUTH_SECURITY } from './modules/auth/auth-security';
import { CoreModule } from './modules/core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AccessModule } from './modules/access/access.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ServicesModule } from './modules/services/services.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { AccountModule } from './modules/account/account.module';

@Module({
  imports:[
    CoreModule,
    JwtModule.register({global:true,secret:process.env.JWT_SECRET ?? (process.env.NODE_ENV==='production'?(()=>{throw new Error('JWT_SECRET não configurado')})():'local-dev-secret'),signOptions:{expiresIn:AUTH_SECURITY.accessTokenTtl}}),
    AuthModule,
    BillingModule,
    NotificationsModule,
    AccessModule,
    ProjectsModule,
    CalendarModule,
    QuotesModule,
    ClientsModule,
    ServicesModule,
    PlatformModule,
    AccountModule,
    AuditModule,
    DashboardModule,
    PricingModule,
  ],
  controllers:[HealthController],
  providers:[
    HealthService,
    ApiService,
    {provide:APP_GUARD,useClass:AuthGuard},
    {provide:APP_GUARD,useClass:TenantActiveGuard},
    {provide:APP_GUARD,useClass:RolesGuard},
    {provide:APP_GUARD,useClass:PermissionsGuard},
  ],
})
export class AppModule {}
