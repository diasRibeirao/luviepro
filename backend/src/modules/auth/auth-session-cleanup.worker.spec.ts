import { AuthSessionCleanupWorker } from './auth-session-cleanup.worker';

describe('AuthSessionCleanupWorker', () => {
  const previous = process.env.AUTH_SESSION_CLEANUP_ENABLED;
  afterEach(() => { if(previous===undefined) delete process.env.AUTH_SESSION_CLEANUP_ENABLED; else process.env.AUTH_SESSION_CLEANUP_ENABLED=previous; jest.restoreAllMocks(); });

  it('uses Redis distributed lock before deleting sessions', async () => {
    const sessions:any={cleanupExpired:jest.fn().mockResolvedValue({deleted:2})};
    const redis:any={ping:jest.fn().mockResolvedValue('PONG'),withLock:jest.fn(async(_key:string,_ttl:number,cb:any)=>({acquired:true,value:await cb()}))};
    const worker=new AuthSessionCleanupWorker(sessions,redis);
    await worker.tick();
    expect(redis.ping).toHaveBeenCalled();
    expect(redis.withLock).toHaveBeenCalledWith('auth:session-cleanup-worker',60000,expect.any(Function));
    expect(sessions.cleanupExpired).toHaveBeenCalledWith(30);
  });

  it('does not delete when distributed lock is unavailable', async () => {
    const sessions:any={cleanupExpired:jest.fn()};
    const redis:any={ping:jest.fn().mockResolvedValue('PONG'),withLock:jest.fn().mockResolvedValue({acquired:false})};
    const worker=new AuthSessionCleanupWorker(sessions,redis);
    await worker.tick();
    expect(sessions.cleanupExpired).not.toHaveBeenCalled();
  });

  it('fails safely when Redis is unavailable', async () => {
    const sessions:any={cleanupExpired:jest.fn()};
    const redis:any={ping:jest.fn().mockRejectedValue(new Error('redis down')),withLock:jest.fn()};
    const worker=new AuthSessionCleanupWorker(sessions,redis);
    await expect(worker.tick()).resolves.toBeUndefined();
    expect(sessions.cleanupExpired).not.toHaveBeenCalled();
  });
});
