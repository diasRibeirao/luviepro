import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service'; import { RedisService } from './redis.service';
@Injectable() export class HealthService {
  constructor(private db:PrismaService,private redis:RedisService){}
  live(){return {status:'ok',service:'luviepro-api',timestamp:new Date().toISOString()};}
  async ready(){const checks={postgres:false,redis:false};try{await this.db.$queryRaw`SELECT 1`;checks.postgres=true}catch{}try{checks.redis=(await this.redis.ping())==='PONG'}catch{}return {status:checks.postgres&&checks.redis?'ok':'degraded',checks,timestamp:new Date().toISOString()};}
}
