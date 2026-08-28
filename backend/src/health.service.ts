import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import {withTimeout} from './resilience/timeout';
import {buildInfo} from './config/build-info';

@Injectable() export class HealthService {
  constructor(private db:PrismaService,private redis:RedisService){}
  live(){return {status:'ok',service:'luviepro-api',...buildInfo(),uptimeSeconds:Math.floor(process.uptime()),timestamp:new Date().toISOString()};}
  async ready(){
    const checks={postgres:false,redis:false};
    try{await withTimeout(this.db.$queryRaw`SELECT 1`,2000,'postgres healthcheck');checks.postgres=true}catch{}
    try{checks.redis=(await withTimeout(this.redis.ping(),2000,'redis healthcheck'))==='PONG'}catch{}
    const payload={status:checks.postgres&&checks.redis?'ok':'degraded',checks,timestamp:new Date().toISOString()};
    if(payload.status!=='ok')throw new ServiceUnavailableException({error:'SERVICE_UNAVAILABLE',message:'Dependências essenciais indisponíveis',...payload});
    return payload;
  }
}
