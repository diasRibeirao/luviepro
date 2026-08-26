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
@Module({
  imports:[JwtModule.register({global:true,secret:process.env.JWT_SECRET ?? (process.env.NODE_ENV==='production'?(()=>{throw new Error('JWT_SECRET não configurado')})():'local-dev-secret'),signOptions:{expiresIn:'15m'}})],
  controllers:[ApiController], providers:[PrismaService,RedisService,HealthService,ApiService,{provide:APP_GUARD,useClass:AuthGuard},{provide:APP_GUARD,useClass:TenantActiveGuard},{provide:APP_GUARD,useClass:RolesGuard}]
}) export class AppModule {}
