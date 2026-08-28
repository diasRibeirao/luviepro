import type { Request, Response } from 'express';
import { refreshTokenExpiresAt } from './auth-security';

const COOKIE_NAME = 'luviepro_refresh';
const WEB_HEADER = 'x-auth-client';

function sameSite(): 'Strict' | 'Lax' | 'None' {
  const value = String(process.env.AUTH_REFRESH_COOKIE_SAMESITE ?? 'strict').trim().toLowerCase();
  if (value === 'none') return 'None';
  if (value === 'lax') return 'Lax';
  return 'Strict';
}

function secureCookie() {
  return process.env.NODE_ENV === 'production' || String(process.env.AUTH_REFRESH_COOKIE_SECURE ?? '').toLowerCase() === 'true';
}

function cookiePath() {
  return '/api/auth';
}

export function isWebAuthClient(req: Pick<Request, 'headers'>) {
  return String(req.headers[WEB_HEADER] ?? '').toLowerCase() === 'web';
}

export function readRefreshCookie(req: Pick<Request, 'headers'>) {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) { try { return decodeURIComponent(rest.join('=')); } catch { return undefined; } }
  }
  return undefined;
}

export function setRefreshCookie(res: Response, refreshToken: string, now = new Date()) {
  const expires = refreshTokenExpiresAt(now);
  const secure = secureCookie();
  const mode = sameSite();
  if (mode === 'None' && !secure) throw new Error('AUTH_REFRESH_COOKIE_SAMESITE=none exige cookie Secure');
  res.cookie(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: mode.toLowerCase() as 'strict' | 'lax' | 'none',
    path: cookiePath(),
    expires,
  });
}

export function clearRefreshCookie(res: Response) {
  const secure = secureCookie();
  const mode = sameSite();
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: mode.toLowerCase() as 'strict' | 'lax' | 'none',
    path: cookiePath(),
  });
}

export function webSessionResponse<T extends { refreshToken: string }>(res: Response, value: T) {
  setRefreshCookie(res, value.refreshToken);
  const { refreshToken: _refreshToken, ...safe } = value;
  return safe;
}
