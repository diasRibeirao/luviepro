import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

export type TrialDurationUnit = "HOURS" | "DAYS" | "WEEKS";

export type TrialSettingsView = {
  enabled: boolean;
  value: number;
  unit: TrialDurationUnit;
  label: string;
  marketingLabel: string;
};

const PLATFORM_SETTING_ID = "default";

@Injectable()
export class TrialService {
  constructor(private readonly db: PrismaService) {}

  private normalizeUnit(value: unknown): TrialDurationUnit {
    const unit = String(value ?? "")
      .trim()
      .toUpperCase();

    if (unit === "HOURS" || unit === "DAYS" || unit === "WEEKS") {
      return unit;
    }

    throw new BadRequestException("Unidade de demonstração inválida");
  }

  private normalizeValue(value: unknown): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        "A duração da demonstração deve ser um número inteiro maior que zero",
      );
    }

    return parsed;
  }

  private durationMs(value: number, unit: TrialDurationUnit): number {
    const hour = 60 * 60 * 1000;

    switch (unit) {
      case "HOURS":
        return value * hour;
      case "DAYS":
        return value * 24 * hour;
      case "WEEKS":
        return value * 7 * 24 * hour;
    }
  }

  formatLabel(value: number, unit: TrialDurationUnit): string {
    if (unit === "HOURS") {
      return `${value} ${value === 1 ? "hora" : "horas"}`;
    }

    if (unit === "DAYS") {
      return `${value} ${value === 1 ? "dia" : "dias"}`;
    }

    return `${value} ${value === 1 ? "semana" : "semanas"}`;
  }

  private toView(settings: {
    trialEnabled: boolean;
    trialDurationValue: number;
    trialDurationUnit: string;
  }): TrialSettingsView {
    const value = this.normalizeValue(settings.trialDurationValue);
    const unit = this.normalizeUnit(settings.trialDurationUnit);
    const label = this.formatLabel(value, unit);

    return {
      enabled: settings.trialEnabled,
      value,
      unit,
      label,
      marketingLabel: `${label} grátis`,
    };
  }

  async getSettings(): Promise<TrialSettingsView> {
    const settings = await this.db.platformSetting.upsert({
      where: { id: PLATFORM_SETTING_ID },
      create: {
        id: PLATFORM_SETTING_ID,
        trialEnabled: true,
        trialDurationValue: 48,
        trialDurationUnit: "HOURS",
      },
      update: {},
    });

    return this.toView(settings);
  }

  async updateSettings(input: {
    enabled?: boolean;
    value?: number;
    unit?: string;
  }): Promise<TrialSettingsView> {
    const current = await this.getSettings();

    const enabled = input.enabled ?? current.enabled;
    const value =
      input.value === undefined
        ? current.value
        : this.normalizeValue(input.value);
    const unit =
      input.unit === undefined ? current.unit : this.normalizeUnit(input.unit);

    const updated = await this.db.platformSetting.upsert({
      where: { id: PLATFORM_SETTING_ID },
      create: {
        id: PLATFORM_SETTING_ID,
        trialEnabled: enabled,
        trialDurationValue: value,
        trialDurationUnit: unit,
      },
      update: {
        trialEnabled: enabled,
        trialDurationValue: value,
        trialDurationUnit: unit,
      },
    });

    return this.toView(updated);
  }

  async calculateInitialExpiration(start = new Date()): Promise<Date | null> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      return null;
    }

    return new Date(
      start.getTime() + this.durationMs(settings.value, settings.unit),
    );
  }

  async getTenantTrial(tenantId: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        plan: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Empresa não encontrada");
    }

    const now = new Date();
    const expiresAt = tenant.subscriptionExpiresAt;
    const remainingMs = expiresAt
      ? Math.max(0, expiresAt.getTime() - now.getTime())
      : 0;

    return {
      ...tenant,
      expired: !expiresAt || expiresAt.getTime() <= now.getTime(),
      remainingMs,
    };
  }

  async extendTenantTrial(
    tenantId: string,
    input: {
      value: number;
      unit: string;
      reason?: string;
    },
    actorUserId?: string,
  ) {
    const value = this.normalizeValue(input.value);
    const unit = this.normalizeUnit(input.unit);
    const reason = String(input.reason ?? "").trim() || null;
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          status: true,
          subscriptionExpiresAt: true,
        },
      });

      if (!tenant) {
        throw new NotFoundException("Empresa não encontrada");
      }

      const previousExpiresAt = tenant.subscriptionExpiresAt;

      const base =
        previousExpiresAt && previousExpiresAt.getTime() > now.getTime()
          ? previousExpiresAt
          : now;

      const newExpiresAt = new Date(
        base.getTime() + this.durationMs(value, unit),
      );

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionExpiresAt: newExpiresAt,
          ...(tenant.status === "expired" && {
            status: "active",
          }),
        },
      });

      const currentTrial = await tx.subscription.findFirst({
        where: {
          tenantId,
          status: "trial",
        },
        orderBy: {
          expiresAt: "desc",
        },
      });

      if (currentTrial) {
        await tx.subscription.update({
          where: { id: currentTrial.id },
          data: {
            expiresAt: newExpiresAt,
          },
        });
      }

      const adjustment = await tx.tenantTrialAdjustment.create({
        data: {
          tenantId,
          previousExpiresAt,
          newExpiresAt,
          amount: value,
          unit,
          reason,
          actorUserId: actorUserId ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: actorUserId ?? null,
          action: "platform_extend_trial",
          entity: "tenant",
          entityId: tenantId,
          metadata: {
            previousExpiresAt: previousExpiresAt?.toISOString() ?? null,
            newExpiresAt: newExpiresAt.toISOString(),
            value,
            unit,
            reason,
          },
        },
      });

      return {
        previousExpiresAt,
        newExpiresAt,
        added: {
          value,
          unit,
          label: this.formatLabel(value, unit),
        },
        adjustmentId: adjustment.id,
      };
    });
  }
}
