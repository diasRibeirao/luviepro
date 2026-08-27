import {ServiceUnavailableException} from '@nestjs/common';
import {HealthService} from './health.service';
describe('HealthService',()=>{
  it('returns ready when postgres and redis are healthy',async()=>{const db={$queryRaw:jest.fn().mockResolvedValue([{one:1}])} as any;const redis={ping:jest.fn().mockResolvedValue('PONG')} as any;const service=new HealthService(db,redis);await expect(service.ready()).resolves.toMatchObject({status:'ok',checks:{postgres:true,redis:true}});});
  it('returns 503 when postgres is unavailable',async()=>{const db={$queryRaw:jest.fn().mockRejectedValue(new Error('db down'))} as any;const redis={ping:jest.fn().mockResolvedValue('PONG')} as any;const service=new HealthService(db,redis);await expect(service.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);});
  it('returns 503 when redis is unavailable',async()=>{const db={$queryRaw:jest.fn().mockResolvedValue([])} as any;const redis={ping:jest.fn().mockRejectedValue(new Error('redis down'))} as any;const service=new HealthService(db,redis);await expect(service.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);});
});
