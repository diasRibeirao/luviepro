import {BillingReconciliationWorker} from './billing-reconciliation.worker';

describe('BillingReconciliationWorker',()=>{
  it('uses worker lock before reconciling payments and subscription expiry',async()=>{
    const billing:any={reconcilePendingBatch:jest.fn().mockResolvedValue({scanned:1,approved:1,pending:0,failed:0,skipped:0})};
    const subscriptions:any={reconcileExpiredBatch:jest.fn().mockResolvedValue({scanned:1,expired:1,activatedScheduled:0})};
    const redis:any={withWorkerLock:jest.fn(async(_k:string,_t:number,cb:any)=>({acquired:true,value:await cb()}))};
    await (new BillingReconciliationWorker(billing,subscriptions,redis) as any).tick();
    expect(redis.withWorkerLock).toHaveBeenCalledWith('billing:reconciliation-worker',55000,expect.any(Function));
    expect(billing.reconcilePendingBatch).toHaveBeenCalledWith(25,5);
    expect(subscriptions.reconcileExpiredBatch).toHaveBeenCalledWith(50);
  });

  it('does not run without lock',async()=>{
    const billing:any={reconcilePendingBatch:jest.fn()};
    const subscriptions:any={reconcileExpiredBatch:jest.fn()};
    const redis:any={withWorkerLock:jest.fn().mockResolvedValue({acquired:false})};
    await (new BillingReconciliationWorker(billing,subscriptions,redis) as any).tick();
    expect(billing.reconcilePendingBatch).not.toHaveBeenCalled();
    expect(subscriptions.reconcileExpiredBatch).not.toHaveBeenCalled();
  });
});
