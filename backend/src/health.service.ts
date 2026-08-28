import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Injectable() export class HealthService {
  constructor(private db:PrismaService,private redis:RedisService){}
  live(){return {status:'ok',service:'luviepro-api',uptimeSeconds:Math.floor(process.uptime()),timestamp:new Date().toISOString()};}
  async ready(){
    const checks={postgres:false,redis:false};
    try{await this.db.$queryRaw`SELECT 1`;checks.postgres=true}catch{}
    try{checks.redis=(await this.redis.ping())==='PONG'}catch{}
    const payload={status:checks.postgres&&checks.redis?'ok':'degraded',checks,timestamp:new Date().toISOString()};
    if(payload.status!=='ok')throw new ServiceUnavailableException({error:'SERVICE_UNAVAILABLE',message:'Dependências essenciais indisponíveis',...payload});
    return payload;
  }
}
