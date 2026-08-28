import {Injectable,Logger,OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import {billingReconciliationConfig} from '../../config/worker-config';
import {RedisService} from '../../redis.service';
import {BillingService} from './billing.service';
import {SubscriptionService} from './subscription.service';

@Injectable()
export class BillingReconciliationWorker implements OnModuleInit,OnModuleDestroy{
  private readonly logger=new Logger(BillingReconciliationWorker.name);
  private timer?:NodeJS.Timeout;
  private running=false;
  constructor(private readonly billing:BillingService,private readonly subscriptions:SubscriptionService,private readonly redis:RedisService){}
  onModuleInit(){const c=billingReconciliationConfig();if(!c.enabled)return;this.timer=setInterval(()=>void this.tick(),c.intervalMs);this.timer.unref?.();setTimeout(()=>void this.tick(),Math.min(15_000,c.intervalMs)).unref?.();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  private async tick(){
    if(this.running)return;this.running=true;
    try{
      const c=billingReconciliationConfig();
      const l=await this.redis.withWorkerLock('billing:reconciliation-worker',c.lockTtlMs,async()=>{
        const payments=await this.billing.reconcilePendingBatch(c.batchSize,c.olderThanMinutes);
        const subscriptions=await this.subscriptions.reconcileExpiredBatch(Math.max(c.batchSize,50));
        return {payments,subscriptions};
      });
      const p=l.value?.payments;const s=l.value?.subscriptions;
      if(l.acquired&&l.value&&((p&&(p.approved||p.failed))||(s&&(s.expired||s.activatedScheduled))))this.logger.log(`billing reconciliation: ${JSON.stringify(l.value)}`);
    }catch(e){this.logger.error(`billing reconciliation failed: ${e instanceof Error?e.message:String(e)}`);}finally{this.running=false;}
  }
}
