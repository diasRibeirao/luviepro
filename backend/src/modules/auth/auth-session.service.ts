import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AUTH_SECURITY, refreshTokenExpiresAt } from './auth-security';

type SessionIssueOptions = { familyId?: string; sessionId?: string };

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  private refreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET ?? (process.env.NODE_ENV === 'production' ? undefined : 'local-dev-refresh-secret');
    if (!secret) throw new Error('JWT_REFRESH_SECRET não configurado');
    return secret;
  }

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async tenantContext(user: any) {
    const effectiveTenant = await this.subscriptions.activateScheduledIfDue(user.tenantId, user.tenant);
    if (effectiveTenant) user = { ...user, tenant: effectiveTenant };
    const profile = user.customProfileId
      ? (user.customProfile ?? await this.db.accessProfile.findFirst({ where: { id: user.customProfileId, tenantId: user.tenantId, active: true } }))
      : null;
    if (user.customProfileId && !profile) throw new ForbiddenException('Seu perfil de acesso está inativo ou indisponível');
    const status = String(user.tenant.status ?? 'active');
    if (status === 'suspended' || status === 'cancelled') throw new ForbiddenException('Conta indisponível');
    // payment_review/expired ainda recebem uma sessão autenticada para acessar exclusivamente o billing.
    // O TenantActiveGuard continua bloqueando todos os demais módulos.
    const permissions = profile && Array.isArray(profile.permissions) ? profile.permissions as string[] : [];
    return { user, profile, permissions };
  }

  private async tenantTokens(user: any, profile: any, permissions: string[], options: SessionIssueOptions = {}) {
    const sessionId = options.sessionId ?? randomUUID();
    const familyId = options.familyId ?? randomUUID();
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      plan: user.tenant.plan,
      customProfileId: profile?.id ?? null,
      permissions,
      sid: sessionId,
    };
    const token = await this.jwt.signAsync({ ...payload, typ: 'access' }, { expiresIn: AUTH_SECURITY.accessTokenTtl });
    const refreshToken = await this.jwt.signAsync({ ...payload, fid: familyId, typ: 'refresh' }, { secret: this.refreshSecret(), expiresIn: AUTH_SECURITY.refreshTokenTtl });
    return { sessionId, familyId, token, refreshToken, refreshTokenHash: this.tokenHash(refreshToken) };
  }

  private async platformTokens(admin: any, options: SessionIssueOptions = {}) {
    const sessionId = options.sessionId ?? randomUUID();
    const familyId = options.familyId ?? randomUUID();
    const payload = { sub: admin.id, role: 'platform_admin', platformAdmin: true, sid: sessionId };
    const token = await this.jwt.signAsync({ ...payload, typ: 'access' }, { expiresIn: AUTH_SECURITY.accessTokenTtl });
    const refreshToken = await this.jwt.signAsync({ ...payload, fid: familyId, typ: 'refresh' }, { secret: this.refreshSecret(), expiresIn: AUTH_SECURITY.refreshTokenTtl });
    return { sessionId, familyId, token, refreshToken, refreshTokenHash: this.tokenHash(refreshToken) };
  }

  async issueTenant(inputUser: any, options: SessionIssueOptions = {}) {
    const { user, profile, permissions } = await this.tenantContext(inputUser);
    const issued = await this.tenantTokens(user, profile, permissions, options);
    await this.db.$transaction(async tx => {
      await tx.authSession.create({ data: {
        id: issued.sessionId,
        familyId: issued.familyId,
        userId: user.id,
        tenantId: user.tenantId,
        refreshTokenHash: issued.refreshTokenHash,
        expiresAt: refreshTokenExpiresAt(),
      } });
    });
    return {
      token: issued.token,
      refreshToken: issued.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, customProfileId: profile?.id ?? null, customProfileName: profile?.name ?? null, permissions },
      tenant: user.tenant,
    };
  }

  async issuePlatform(admin: any, options: SessionIssueOptions = {}) {
    const issued = await this.platformTokens(admin, options);
    await this.db.$transaction(async tx => {
      await tx.authSession.create({ data: {
        id: issued.sessionId,
        familyId: issued.familyId,
        platformAdminId: admin.id,
        refreshTokenHash: issued.refreshTokenHash,
        expiresAt: refreshTokenExpiresAt(),
      } });
      await tx.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    });
    return { token: issued.token, refreshToken: issued.refreshToken, user: { id: admin.id, name: admin.name, email: admin.email, role: 'platform_admin' }, platform: true };
  }

  private async revokeFamily(familyId: string, reason: string) {
    await this.db.authSession.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  }


  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() }); }
    catch { throw new UnauthorizedException('Sessão expirada'); }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Token de renovação inválido');
    if (!payload.sid || !payload.fid) throw new UnauthorizedException('Sessão revogada');

    const session = await this.db.authSession.findUnique({ where: { id: payload.sid } });
    if (!session) throw new UnauthorizedException('Sessão revogada');
    if (!payload.fid || payload.fid !== session.familyId) {
      await this.revokeFamily(session.familyId, 'refresh_family_mismatch');
      throw new UnauthorizedException('Sessão revogada');
    }
    if (session.revokedAt) {
      await this.revokeFamily(session.familyId, 'refresh_reuse_detected');
      throw new UnauthorizedException('Sessão revogada');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.db.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'expired' } });
      throw new UnauthorizedException('Sessão expirada');
    }
    if (session.refreshTokenHash !== this.tokenHash(refreshToken)) {
      await this.revokeFamily(session.familyId, 'refresh_hash_mismatch');
      throw new UnauthorizedException('Sessão revogada');
    }

    const platform = payload.platformAdmin === true || payload.role === 'platform_admin';
    let principal: any;
    let context: any = null;
    if (platform) {
      if (session.platformAdminId !== payload.sub || session.userId) {
        await this.revokeFamily(session.familyId, 'principal_mismatch');
        throw new UnauthorizedException('Sessão revogada');
      }
      principal = await this.db.platformAdmin.findUnique({ where: { id: payload.sub } });
      if (!principal?.active) throw new UnauthorizedException('Sessão revogada');
    } else {
      if (session.userId !== payload.sub || session.tenantId !== payload.tenantId || session.platformAdminId) {
        await this.revokeFamily(session.familyId, 'principal_mismatch');
        throw new UnauthorizedException('Sessão revogada');
      }
      principal = await this.db.user.findUnique({ where: { id: payload.sub }, include: { tenant: true, customProfile: true } });
      if (!principal?.active || payload.tenantId !== principal.tenantId) throw new UnauthorizedException('Sessão revogada');
      context = await this.tenantContext(principal);
      principal = context.user;
    }

    const nextSessionId = randomUUID();
    const issued = platform
      ? await this.platformTokens(principal, { familyId: session.familyId, sessionId: nextSessionId })
      : await this.tenantTokens(principal, context.profile, context.permissions, { familyId: session.familyId, sessionId: nextSessionId });
    const now = new Date();

    await this.db.$transaction(async tx => {
      const claimed = await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now, revokedReason: 'rotated', replacedBySessionId: nextSessionId, lastUsedAt: now },
      });
      if (claimed.count !== 1) throw new UnauthorizedException('Sessão revogada');
      await tx.authSession.create({ data: {
        id: issued.sessionId,
        familyId: issued.familyId,
        userId: platform ? null : principal.id,
        platformAdminId: platform ? principal.id : null,
        tenantId: platform ? null : principal.tenantId,
        refreshTokenHash: issued.refreshTokenHash,
        expiresAt: refreshTokenExpiresAt(now),
      } });
    }).catch(async error => {
      if (error instanceof UnauthorizedException) await this.revokeFamily(session.familyId, 'refresh_reuse_detected');
      throw error;
    });

    if (platform) {
      return { token: issued.token, refreshToken: issued.refreshToken, user: { id: principal.id, name: principal.name, email: principal.email, role: 'platform_admin' }, platform: true };
    }
    return {
      token: issued.token,
      refreshToken: issued.refreshToken,
      user: { id: principal.id, name: principal.name, email: principal.email, role: principal.role, customProfileId: context.profile?.id ?? null, customProfileName: context.profile?.name ?? null, permissions: context.permissions },
      tenant: principal.tenant,
    };
  }

  async revokeTenant(userId: string, tenantId: string, sessionId?: string) {
    const where = sessionId ? { id: sessionId, userId, tenantId, revokedAt: null } : { userId, tenantId, revokedAt: null };
    await this.db.authSession.updateMany({ where, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  }

  async revokePlatform(adminId: string, sessionId?: string) {
    const where = sessionId ? { id: sessionId, platformAdminId: adminId, revokedAt: null } : { platformAdminId: adminId, revokedAt: null };
    await this.db.authSession.updateMany({ where, data: { revokedAt: new Date(), revokedReason: 'logout' } });
  }

  async revokeAllForUser(userId: string, reason = 'security_reset') {
    await this.db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  }
  async listTenantSessions(userId: string, tenantId: string, currentSessionId?: string) {
    const now = new Date();
    const sessions = await this.db.authSession.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, familyId: true, createdAt: true, updatedAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, revokedReason: true },
    });
    return sessions.map(session => ({
      id: session.id,
      current: session.id === currentSessionId,
      active: !session.revokedAt && session.expiresAt.getTime() > now.getTime(),
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      revokedReason: session.revokedReason,
    }));
  }

  async revokeTenantSession(userId: string, tenantId: string, targetSessionId: string) {
    const result = await this.db.authSession.updateMany({
      where: { id: targetSessionId, userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'user_revoked_device' },
    });
    if (result.count !== 1) throw new UnauthorizedException('Sessão não encontrada ou já revogada');
    return { ok: true };
  }

  async revokeOtherTenantSessions(userId: string, tenantId: string, currentSessionId?: string) {
    const result = await this.db.authSession.updateMany({
      where: {
        userId,
        tenantId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date(), revokedReason: 'user_revoked_other_devices' },
    });
    return { ok: true, revoked: result.count };
  }

  async cleanupExpired(retentionDays = 30) {
    const safeRetentionDays = Math.max(1, Math.min(365, Math.trunc(retentionDays)));
    const cutoff = new Date(Date.now() - safeRetentionDays * 86_400_000);
    const result = await this.db.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { revokedAt: { lt: cutoff } },
        ],
      },
    });
    return { deleted: result.count };
  }

}
