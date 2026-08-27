import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { AuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { HealthService } from './health.service';
import { TenantActiveGuard } from './tenant-active.guard';
import { RolesGuard } from './roles.guard';
import { MailService } from './mail.service';
import { PermissionsGuard } from './permissions.guard';
import { NotificationsService } from './modules/notifications/notifications.service';
import { BillingService } from './modules/billing/billing.service';
import { SubscriptionService } from './modules/billing/subscription.service';
import { BillingReconciliationWorker } from './modules/billing/billing-reconciliation.worker';
@Module({
  imports:[JwtModule.register({global:true,secret:process.env.JWT_SECRET ?? (process.env.NODE_ENV==='production'?(()=>{throw new Error('JWT_SECRET não configurado')})():'local-dev-secret'),signOptions:{expiresIn:'15m'}})],
  controllers:[ApiController], providers:[PrismaService,RedisService,HealthService,MailService,NotificationsService,SubscriptionService,BillingService,BillingReconciliationWorker,ApiService,{provide:APP_GUARD,useClass:AuthGuard},{provide:APP_GUARD,useClass:TenantActiveGuard},{provide:APP_GUARD,useClass:RolesGuard},{provide:APP_GUARD,useClass:PermissionsGuard}]
}) export class AppModule {}
