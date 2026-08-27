import { RedisService } from './redis.service';

describe('RedisService rate limit',()=>{
  it('retorna limites calculados pelo Redis',async()=>{
    const service=new RedisService();
    (service as any).client={status:'ready',eval:jest.fn().mockResolvedValue([3,42])};
    await expect(service.consumeRateLimit('login:ip',8,60)).resolves.toEqual({allowed:true,remaining:5,retryAfter:42});
  });

  it('bloqueia quando o limite distribuído é excedido',async()=>{
    const service=new RedisService();
    (service as any).client={status:'ready',eval:jest.fn().mockResolvedValue([9,31])};
    await expect(service.consumeRateLimit('login:ip',8,60)).resolves.toEqual({allowed:false,remaining:0,retryAfter:31});
  });

  it('usa contingência local quando o Redis está indisponível',async()=>{
    const service=new RedisService();
    (service as any).client={status:'ready',eval:jest.fn().mockRejectedValue(new Error('offline'))};
    await expect(service.consumeRateLimit('register:ip',1,60)).resolves.toEqual(expect.objectContaining({allowed:true,remaining:0}));
    await expect(service.consumeRateLimit('register:ip',1,60)).resolves.toEqual(expect.objectContaining({allowed:false,remaining:0}));
  });
});
