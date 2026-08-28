export const AUTH_SECURITY = Object.freeze({
  accessTokenTtl: '15m' as const,
  refreshTokenTtl: '30d' as const,
  refreshTokenDays: 30,
  maxFailedLoginAttempts: 5,
  lockMinutes: 15,
  passwordResetMinutes: 60,
  minPasswordLength: 8,
  bcryptRounds: 12,
});

export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function assertPasswordPolicy(password: string) {
  if (password.length < AUTH_SECURITY.minPasswordLength) throw new Error(`A senha deve ter pelo menos ${AUTH_SECURITY.minPasswordLength} caracteres`);
}
export function passwordResetExpiresAt(now = new Date()) { return new Date(now.getTime() + AUTH_SECURITY.passwordResetMinutes * 60_000); }
export function accountLockedUntil(now = new Date()) { return new Date(now.getTime() + AUTH_SECURITY.lockMinutes * 60_000); }
export function refreshTokenExpiresAt(now = new Date()) { return new Date(now.getTime() + AUTH_SECURITY.refreshTokenDays * 24 * 60 * 60_000); }
