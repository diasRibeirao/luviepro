import { BillingReconciliationWorker } from './billing-reconciliation.worker';

describe('BillingReconciliationWorker',()=>{
  it('usa lock distribuído antes de reconciliar pendências',async()=>{
    const billing:any={reconcilePendingBatch:jest.fn().mockResolvedValue({scanned:1,approved:1,pending:0,failed:0,skipped:0})};
    const redis:any={ping:jest.fn().mockResolvedValue('PONG'),withLock:jest.fn(async(_key:string,_ttl:number,cb:()=>Promise<any>)=>({acquired:true,value:await cb()}))};
    const worker=new BillingReconciliationWorker(billing,redis);
    await (worker as any).tick();
    expect(redis.withLock).toHaveBeenCalledWith('billing:reconciliation-worker',55_000,expect.any(Function));
    expect(billing.reconcilePendingBatch).toHaveBeenCalled();
  });

  it('não executa lote quando outra instância possui o lock',async()=>{
    const billing:any={reconcilePendingBatch:jest.fn()};
    const redis:any={ping:jest.fn().mockResolvedValue('PONG'),withLock:jest.fn().mockResolvedValue({acquired:false})};
    const worker=new BillingReconciliationWorker(billing,redis);
    await (worker as any).tick();
    expect(billing.reconcilePendingBatch).not.toHaveBeenCalled();
  });
});
