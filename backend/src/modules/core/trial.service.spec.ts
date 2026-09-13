import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TrialService } from "./trial.service";

describe("TrialService", () => {
  const db: any = {
    platformSetting: {
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    tenantTrialAdjustment: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: TrialService;

  beforeEach(() => {
    jest.clearAllMocks();

    db.$transaction.mockImplementation(async (callback: any) => callback(db));

    db.platformSetting.upsert.mockResolvedValue({
      id: "default",
      trialEnabled: true,
      trialDurationValue: 48,
      trialDurationUnit: "HOURS",
    });

    service = new TrialService(db);
  });

  it("uses 48 hours as the default configuration", async () => {
    await expect(service.getSettings()).resolves.toEqual({
      enabled: true,
      value: 48,
      unit: "HOURS",
      label: "48 horas",
      marketingLabel: "48 horas grátis",
    });
  });

  it("calculates 48 hours from the supplied start", async () => {
    const start = new Date("2026-09-13T12:00:00.000Z");

    await expect(service.calculateInitialExpiration(start)).resolves.toEqual(
      new Date("2026-09-15T12:00:00.000Z"),
    );
  });

  it("supports days", async () => {
    db.platformSetting.upsert.mockResolvedValue({
      id: "default",
      trialEnabled: true,
      trialDurationValue: 3,
      trialDurationUnit: "DAYS",
    });

    const start = new Date("2026-09-13T12:00:00.000Z");

    await expect(service.calculateInitialExpiration(start)).resolves.toEqual(
      new Date("2026-09-16T12:00:00.000Z"),
    );
  });

  it("supports weeks", async () => {
    db.platformSetting.upsert.mockResolvedValue({
      id: "default",
      trialEnabled: true,
      trialDurationValue: 2,
      trialDurationUnit: "WEEKS",
    });

    const start = new Date("2026-09-13T12:00:00.000Z");

    await expect(service.calculateInitialExpiration(start)).resolves.toEqual(
      new Date("2026-09-27T12:00:00.000Z"),
    );
  });

  it("returns null when trial is disabled", async () => {
    db.platformSetting.upsert.mockResolvedValue({
      id: "default",
      trialEnabled: false,
      trialDurationValue: 48,
      trialDurationUnit: "HOURS",
    });

    await expect(
      service.calculateInitialExpiration(new Date("2026-09-13T12:00:00.000Z")),
    ).resolves.toBeNull();
  });

  it("formats singular and plural labels", () => {
    expect(service.formatLabel(1, "HOURS")).toBe("1 hora");
    expect(service.formatLabel(48, "HOURS")).toBe("48 horas");

    expect(service.formatLabel(1, "DAYS")).toBe("1 dia");
    expect(service.formatLabel(3, "DAYS")).toBe("3 dias");

    expect(service.formatLabel(1, "WEEKS")).toBe("1 semana");
    expect(service.formatLabel(2, "WEEKS")).toBe("2 semanas");
  });

  it("rejects zero duration", async () => {
    await expect(
      service.updateSettings({
        value: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an invalid unit", async () => {
    await expect(
      service.updateSettings({
        unit: "MONTHS",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("extends an active trial from current expiration", async () => {
    const previous = new Date(Date.now() + 60 * 60 * 1000);

    db.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      subscriptionExpiresAt: previous,
    });

    db.subscription.findFirst.mockResolvedValue({
      id: "subscription-1",
    });

    db.tenant.update.mockResolvedValue({});
    db.subscription.update.mockResolvedValue({});

    db.tenantTrialAdjustment.create.mockResolvedValue({
      id: "adjustment-1",
    });

    db.auditLog.create.mockResolvedValue({});

    const result = await service.extendTenantTrial(
      "tenant-1",
      {
        value: 24,
        unit: "HOURS",
        reason: "Extensão comercial",
      },
      "platform-admin-1",
    );

    expect(result.newExpiresAt.getTime()).toBe(
      previous.getTime() + 24 * 60 * 60 * 1000,
    );

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: {
        id: "tenant-1",
      },
      data: {
        subscriptionExpiresAt: result.newExpiresAt,
      },
    });

    expect(db.subscription.update).toHaveBeenCalledWith({
      where: {
        id: "subscription-1",
      },
      data: {
        expiresAt: result.newExpiresAt,
      },
    });

    expect(db.tenantTrialAdjustment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        previousExpiresAt: previous,
        newExpiresAt: result.newExpiresAt,
        amount: 24,
        unit: "HOURS",
        actorUserId: "platform-admin-1",
      }),
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        actorUserId: "platform-admin-1",
        action: "platform_extend_trial",
        entity: "tenant",
        entityId: "tenant-1",
        metadata: expect.objectContaining({
          value: 24,
          unit: "HOURS",
          reason: "Extensão comercial",
        }),
      }),
    });
  });

  it("extends an expired trial from now", async () => {
    const before = Date.now();

    db.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      status: "expired",
      subscriptionExpiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    db.subscription.findFirst.mockResolvedValue(null);
    db.tenant.update.mockResolvedValue({});

    db.tenantTrialAdjustment.create.mockResolvedValue({
      id: "adjustment-1",
    });

    db.auditLog.create.mockResolvedValue({});

    const result = await service.extendTenantTrial(
      "tenant-1",
      {
        value: 6,
        unit: "HOURS",
      },
      "platform-admin-1",
    );

    const after = Date.now();

    expect(result.newExpiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 6 * 60 * 60 * 1000,
    );

    expect(result.newExpiresAt.getTime()).toBeLessThanOrEqual(
      after + 6 * 60 * 60 * 1000,
    );

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: {
        id: "tenant-1",
      },
      data: {
        subscriptionExpiresAt: result.newExpiresAt,
        status: "active",
      },
    });
  });

  it("rejects an unknown tenant", async () => {
    db.tenant.findUnique.mockResolvedValue(null);

    await expect(
      service.extendTenantTrial(
        "missing",
        {
          value: 1,
          unit: "DAYS",
        },
        "platform-admin-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
