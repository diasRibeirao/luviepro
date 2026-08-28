import { createHash } from 'crypto';
export function providerIdempotencyKey(scope:string,...parts:string[]):string{const normalized=[scope,...parts].map(x=>x.trim()).join(':');return createHash('sha256').update(normalized).digest('hex');}
