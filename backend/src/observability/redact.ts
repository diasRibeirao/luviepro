const SECRET_KEYS=/password|token|secret|authorization|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token/i;
export function redact(value:unknown,depth=0):unknown{
  if(depth>6)return '[MAX_DEPTH]';
  if(Array.isArray(value))return value.map(v=>redact(v,depth+1));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,SECRET_KEYS.test(k)?'[REDACTED]':redact(v,depth+1)]));
  return value;
}
