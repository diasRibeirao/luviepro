import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { MetricsService } from '../../observability/metrics.service';
import { buildInfo } from '../../config/build-info';
import { withTimeout } from '../../resilience/timeout';

type CheckState = 'ok' | 'warning' | 'down';

type DependencyCheck = {
  state: CheckState;
  latencyMs?: number;
  detail?: string;
};

@Injectable()
export class PlatformHealthService {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  private configured(...values: Array<string | undefined>) {
    return values.every((value) => Boolean(value?.trim()));
  }

  private async timed<T>(work: () => Promise<T>, timeoutMs = 2500) {
    const started = process.hrtime.bigint();
    try {
      const value = await withTimeout(work(), timeoutMs, 'platform health diagnostic');
      const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
      return { ok: true as const, value, latencyMs: Number(elapsed.toFixed(1)) };
    } catch {
      const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
      return { ok: false as const, latencyMs: Number(elapsed.toFixed(1)) };
    }
  }

  async diagnostic(requestId?: string) {
    const postgresResult = await this.timed(async () => {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    });

    const redisResult = await this.timed(async () => (await this.redis.ping()) === 'PONG');

    const schemaResult = await this.timed(async () => {
      const rows = await this.db.$queryRaw<Array<{ applied: bigint; pending_or_failed: bigint }>>`
        SELECT
          COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied,
          COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS pending_or_failed
        FROM "_prisma_migrations"
      `;
      return {
        applied: Number(rows[0]?.applied ?? 0),
        pendingOrFailed: Number(rows[0]?.pending_or_failed ?? 0),
      };
    });

    const database: DependencyCheck = postgresResult.ok
      ? { state: 'ok', latencyMs: postgresResult.latencyMs, detail: 'PostgreSQL conectado' }
      : { state: 'down', latencyMs: postgresResult.latencyMs, detail: 'PostgreSQL indisponível' };

    const redis: DependencyCheck = redisResult.ok && redisResult.value
      ? { state: 'ok', latencyMs: redisResult.latencyMs, detail: 'Redis conectado' }
      : { state: 'down', latencyMs: redisResult.latencyMs, detail: 'Redis indisponível' };

    const schema: DependencyCheck & { appliedMigrations?: number; pendingOrFailed?: number } = schemaResult.ok
      ? {
          state: schemaResult.value.pendingOrFailed > 0 ? 'warning' : 'ok',
          latencyMs: schemaResult.latencyMs,
          appliedMigrations: schemaResult.value.applied,
          pendingOrFailed: schemaResult.value.pendingOrFailed,
          detail: schemaResult.value.pendingOrFailed > 0 ? 'Há migration pendente ou incompleta' : 'Migrations aplicadas',
        }
      : { state: 'warning', latencyMs: schemaResult.latencyMs, detail: 'Não foi possível consultar migrations' };

    const mercadoPagoConfigured = this.configured(process.env.MERCADO_PAGO_ACCESS_TOKEN, process.env.MERCADO_PAGO_WEBHOOK_SECRET);
    const mailProvider = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
    const mailConfigured = mailProvider === 'resend'
      ? this.configured(process.env.RESEND_API_KEY, process.env.RESEND_FROM)
      : mailProvider === 'smtp'
        ? this.configured(process.env.SMTP_HOST, process.env.SMTP_FROM)
          && (!process.env.SMTP_USER?.trim() || Boolean(process.env.SMTP_PASS?.trim()))
        : false;

    const metrics = this.metrics.snapshot();
    const essentialOk = database.state === 'ok' && redis.state === 'ok' && schema.state !== 'down';
    const integrationsOk = mercadoPagoConfigured && mailConfigured;
    const status: CheckState = !essentialOk ? 'down' : integrationsOk && schema.state === 'ok' ? 'ok' : 'warning';

    return {
      status,
      service: 'luviepro-api',
      ...buildInfo(),
      requestId: requestId ?? null,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies: {
        database,
        redis,
        schema,
      },
      integrations: {
        mercadoPago: {
          state: mercadoPagoConfigured ? 'ok' : 'warning',
          configured: mercadoPagoConfigured,
          sandbox: process.env.MERCADO_PAGO_USE_SANDBOX === 'true',
          detail: mercadoPagoConfigured ? 'Credenciais e segredo de webhook configurados' : 'Configuração incompleta',
        },
        email: {
          state: mailConfigured ? 'ok' : 'warning',
          configured: mailConfigured,
          provider: mailProvider || 'não configurado',
          detail: mailConfigured ? 'Provedor de e-mail configurado' : 'Configuração de e-mail incompleta',
        },
      },
      api: {
        requests: metrics.requests,
        errors: metrics.errors,
        uptimeSeconds: metrics.uptimeSeconds,
      },
    };
  }
}
