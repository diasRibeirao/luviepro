import { PayloadTooLargeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { exceedsContentLength } from './request-size';

export function requestSizeLimitBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.HTTP_MAX_REQUEST_BYTES?.trim();
  if (!raw) return 1_048_576;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1_024 && value <= 10_485_760 ? value : 1_048_576;
}

export function requestSizeMiddleware(maxBytes = requestSizeLimitBytes()) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.header('content-length');
    if (exceedsContentLength(value, maxBytes)) throw new PayloadTooLargeException(`Request body exceeds ${maxBytes} bytes`);
    next();
  };
}
