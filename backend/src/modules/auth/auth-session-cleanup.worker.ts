import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';
import { RedisService } from '../../redis.service';

@Injectable()
export class AuthSessionCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthSessionCleanupWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly sessions: AuthSessionService, private readonly redis: RedisService) {}

  onModuleInit() {
    const enabled = process.env.AUTH_SESSION_CLEANUP_ENABLED === 'true' ||
      (process.env.AUTH_SESSION_CLEANUP_ENABLED === undefined && process.env.NODE_ENV === 'production');
    if (!enabled) return;
    const interval = Math.max(3_600_000, Number(process.env.AUTH_SESSION_CLEANUP_INTERVAL_MS ?? 86_400_000));
    this.timer = setInterval(() => void this.tick(), interval);
    this.timer.unref?.();
    setTimeout(() => void this.tick(), Math.min(15_000, interval)).unref?.();
  }

  async tick() {
    const retentionDays = Math.max(1, Math.min(365, Number(process.env.AUTH_SESSION_RETENTION_DAYS ?? 30)));
    try {
      await this.redis.ping();
      const result = await this.redis.withLock('auth:session-cleanup-worker', 60_000, () => this.sessions.cleanupExpired(retentionDays));
      if (result.acquired && result.value?.deleted) this.logger.log(`auth session cleanup: ${JSON.stringify(result.value)}`);
    } catch (error) {
      this.logger.error(`auth session cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
