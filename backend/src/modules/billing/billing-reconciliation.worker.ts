import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RedisService } from '../../redis.service';

@Injectable()
export class BillingReconciliationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger=new Logger(BillingReconciliationWorker.name);
  private timer?:NodeJS.Timeout;
  private running=false;
  constructor(private readonly billing:BillingService,private readonly redis:RedisService){}

  onModuleInit(){
    const enabled=process.env.BILLING_RECONCILIATION_ENABLED!==undefined
      ? process.env.BILLING_RECONCILIATION_ENABLED==='true'
      : process.env.NODE_ENV==='production';
    if(!enabled)return;
    const intervalMs=Math.max(60_000,Number(process.env.BILLING_RECONCILIATION_INTERVAL_MS??300_000));
    this.timer=setInterval(()=>void this.tick(),intervalMs);this.timer.unref?.();
    setTimeout(()=>void this.tick(),Math.min(15_000,intervalMs)).unref?.();
  }

  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}

  private async tick(){
    if(this.running)return;this.running=true;
    try{
      await this.redis.ping();
      const lock=await this.redis.withLock('billing:reconciliation-worker',55_000,async()=>{
        const limit=Math.max(1,Math.min(100,Number(process.env.BILLING_RECONCILIATION_BATCH_SIZE??25)));
        const olderThan=Math.max(1,Number(process.env.BILLING_RECONCILIATION_OLDER_THAN_MINUTES??5));
        return this.billing.reconcilePendingBatch(limit,olderThan);
      });
      if(lock.acquired&&lock.value&&(lock.value.approved||lock.value.failed))this.logger.log(`billing reconciliation: ${JSON.stringify(lock.value)}`);
    }catch(error:any){this.logger.error(`billing reconciliation failed: ${String(error?.message||error)}`);}
    finally{this.running=false;}
  }
}
