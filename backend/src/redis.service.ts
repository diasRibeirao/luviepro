import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
@Injectable() export class RedisService implements OnModuleDestroy {
  private readonly client=new Redis({host:process.env.REDIS_HOST??'localhost',port:Number(process.env.REDIS_PORT??6380),db:Number(process.env.REDIS_DB??0),keyPrefix:process.env.REDIS_KEY_PREFIX??'luviepro:dev:',lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false});
  private readonly localLocks=new Set<string>();
  private readonly localRateLimits=new Map<string,{count:number;expiresAt:number}>();
  async ping(){if(this.client.status==='wait')await this.client.connect();return this.client.ping();}
  async withLock<T>(key:string,ttlMs:number,callback:()=>Promise<T>):Promise<{acquired:boolean;value?:T}> {
    const token=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let redisLock=false;
    try{
      if(this.client.status==='wait')await this.client.connect();
      redisLock=(await this.client.set(key,token,'PX',ttlMs,'NX'))==='OK';
      if(!redisLock)return {acquired:false};
    }catch{
      if(this.localLocks.has(key))return {acquired:false};
      this.localLocks.add(key);
    }
    try{return {acquired:true,value:await callback()};}
    finally{
      if(redisLock){
        await this.client.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key,token).catch(()=>undefined);
      }else this.localLocks.delete(key);
    }
  }
  async consumeRateLimit(key:string,limit:number,windowSeconds:number){
    try{
      if(this.client.status==='wait')await this.client.connect();
      const result=await this.client.eval("local count=redis.call('INCR',KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return {count,redis.call('TTL',KEYS[1])}",1,key,String(windowSeconds)) as [number,number];
      const count=Number(result[0]),retryAfter=Math.max(1,Number(result[1]));return {allowed:count<=limit,remaining:Math.max(0,limit-count),retryAfter};
    }catch{
      const now=Date.now(),current=this.localRateLimits.get(key);const entry=!current||current.expiresAt<=now?{count:1,expiresAt:now+windowSeconds*1000}:{count:current.count+1,expiresAt:current.expiresAt};
      this.localRateLimits.set(key,entry);if(this.localRateLimits.size>5000)for(const [storedKey,value] of this.localRateLimits)if(value.expiresAt<=now)this.localRateLimits.delete(storedKey);
      return {allowed:entry.count<=limit,remaining:Math.max(0,limit-entry.count),retryAfter:Math.max(1,Math.ceil((entry.expiresAt-now)/1000))};
    }
  }
  async onModuleDestroy(){if(this.client.status!=='end')this.client.disconnect();}
}
