import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../../mail.service';
import { AUTH_SECURITY, accountLockedUntil, normalizeEmail, passwordResetExpiresAt } from './auth-security';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly mail: MailService,
    private readonly sessions: AuthSessionService,
  ) {}

  private async audit(tenantId: string, actorUserId: string | undefined, action: string, entity: string, entityId?: string, metadata?: unknown) {
    await this.db.auditLog.create({ data: { tenantId, actorUserId, action, entity, entityId, metadata: metadata as any } }).catch(() => undefined);
  }

  async login(email: string, password: string) {
    const normalized = normalizeEmail(email);
    const user = await this.db.user.findUnique({ where: { email: normalized }, include: { tenant: true, customProfile: true } });
    if (!user) {
      const platform = await this.db.platformAdmin.findUnique({ where: { email: normalized } });
      if (platform) return this.platformLogin(normalized, password);
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      await this.audit(user.tenantId, user.id, 'login_blocked', 'user', user.id, { reason: 'temporary_lock' });
      throw new UnauthorizedException('Acesso temporariamente bloqueado. Tente novamente em alguns minutos.');
    }
    if (!user.active) {
      await this.audit(user.tenantId, user.id, 'login_failed', 'user', user.id, { reason: 'inactive' });
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (!await compare(password, user.passwordHash)) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = attempts >= AUTH_SECURITY.maxFailedLoginAttempts ? accountLockedUntil(now) : null;
      await this.db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil } });
      await this.audit(user.tenantId, user.id, lockedUntil ? 'account_locked' : 'login_failed', 'user', user.id, { reason: 'invalid_credentials', attempts, lockMinutes: lockedUntil ? AUTH_SECURITY.lockMinutes : 0 });
      throw new UnauthorizedException(lockedUntil ? `Acesso temporariamente bloqueado após várias tentativas. Tente novamente em ${AUTH_SECURITY.lockMinutes} minutos.` : 'E-mail ou senha inválidos');
    }
    await this.db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now } });
    const session = await this.sessions.issueTenant({ ...user, lastLoginAt: now, failedLoginAttempts: 0, lockedUntil: null });
    await this.audit(user.tenantId, user.id, 'login_success', 'user', user.id);
    return session;
  }

  async platformLogin(email: string, password: string) {
    const admin = await this.db.platformAdmin.findUnique({ where: { email: normalizeEmail(email) } });
    if (!admin || !admin.active || !await compare(password, admin.passwordHash)) throw new UnauthorizedException('E-mail ou senha inválidos');
    return this.sessions.issuePlatform(admin);
  }

  refresh(refreshToken: string) { return this.sessions.refresh(refreshToken); }

  async logout(userId: string, tenantId: string, sessionId?: string) {
    await this.sessions.revokeTenant(userId, tenantId, sessionId);
    await this.audit(tenantId, userId, 'logout', 'user', userId);
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const normalized = normalizeEmail(email);
    const user = await this.db.user.findUnique({ where: { email: normalized } });
    const response: any = { ok: true, message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' };
    if (!user?.active) return response;
    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = passwordResetExpiresAt();
    await this.db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await this.db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    const appUrl = (process.env.APP_URL || 'http://localhost:8081').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${raw}`;
    const sent = await this.mail.sendPasswordReset({ to: user.email, name: user.name, resetUrl, expiresAt });
    if (process.env.NODE_ENV !== 'production' && !sent.sent) response.devResetUrl = resetUrl;
    await this.audit(user.tenantId, user.id, 'password_reset_requested', 'user', user.id, { emailSent: sent.sent });
    return response;
  }

  async resetPassword(token: string, password: string) {
    if (password.length < AUTH_SECURITY.minPasswordLength) throw new BadRequestException(`A senha deve ter pelo menos ${AUTH_SECURITY.minPasswordLength} caracteres`);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now() || !record.user.active) throw new BadRequestException('Link de redefinição inválido ou expirado');
    await this.db.$transaction(async tx => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash: await hash(password, AUTH_SECURITY.bcryptRounds), passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null } });
      await tx.authSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'password_reset' } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    });
    await this.audit(record.user.tenantId, record.userId, 'password_reset_completed', 'user', record.userId);
    return { ok: true };
  }

  async register(data: any) {
    const email = normalizeEmail(String(data.email ?? ''));
    const password = String(data.password ?? '');
    const name = String(data.name ?? '').trim();
    const company = String(data.company ?? '').trim();
    if (!email || !name || !company || password.length < AUTH_SECURITY.minPasswordLength) throw new BadRequestException(`Informe empresa, responsável, e-mail e senha com pelo menos ${AUTH_SECURITY.minPasswordLength} caracteres`);
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('Este e-mail já está cadastrado');
    const plan = ['starter', 'pro', 'business'].includes(data.plan) ? data.plan : 'starter';
    const period = ['monthly', 'quarterly', 'semiannual', 'annual'].includes(data.period) ? data.period : 'monthly';
    const limit = await this.db.planLimit.findUnique({ where: { plan } });
    if (!limit) throw new BadRequestException('Plano indisponível');
    const amountCents = period === 'annual' ? limit.annualPriceCents : period === 'semiannual' ? limit.semiannualPriceCents : period === 'quarterly' ? limit.quarterlyPriceCents : limit.monthlyPriceCents;
    const now = new Date(); const trialEnd = new Date(now); trialEnd.setDate(trialEnd.getDate() + 14);
    const slug = `${company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'empresa'}-${Date.now().toString(36)}`;
    const result = await this.db.$transaction(async tx => {
      const tenant = await tx.tenant.create({ data: { name: company, slug, responsibleName: name, phone: data.phone, contactEmail: email, plan, planPeriod: period, subscriptionExpiresAt: trialEnd } });
      const user = await tx.user.create({ data: { tenantId: tenant.id, name, email, passwordHash: await hash(password, AUTH_SECURITY.bcryptRounds), role: 'owner' } });
      await tx.subscription.create({ data: { tenantId: tenant.id, plan, period, amountCents, status: 'trial', startsAt: now, expiresAt: trialEnd } });
      return { tenant, user };
    });
    await this.audit(result.tenant.id, result.user.id, 'register', 'tenant', result.tenant.id, { plan, period });
    return this.sessions.issueTenant({ ...result.user, tenant: result.tenant });
  }
}
