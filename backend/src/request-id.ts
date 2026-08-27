import { randomUUID } from 'crypto';

export function requestId(value:unknown){
  const candidate=Array.isArray(value)?value[0]:value;
  return typeof candidate==='string'&&/^[A-Za-z0-9._-]{8,128}$/.test(candidate)?candidate:randomUUID();
}
