import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
@Injectable() export class RedisService implements OnModuleDestroy {
  private readonly client=new Redis({host:process.env.REDIS_HOST??'localhost',port:Number(process.env.REDIS_PORT??6380),db:Number(process.env.REDIS_DB??0),keyPrefix:process.env.REDIS_KEY_PREFIX??'luviepro:dev:',lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false});
  async ping(){if(this.client.status==='wait')await this.client.connect();return this.client.ping();}
  async onModuleDestroy(){if(this.client.status!=='end')this.client.disconnect();}
}
