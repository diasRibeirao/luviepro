import type { JsonValue } from '../domain/json-value';
export type AuditDiff={before:Record<string,JsonValue>;after:Record<string,JsonValue>;changed:string[]};
export function auditDiff(before:Record<string,JsonValue>,after:Record<string,JsonValue>):AuditDiff{const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].sort();const changed=keys.filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));return {before:Object.fromEntries(changed.map(k=>[k,before[k]])),after:Object.fromEntries(changed.map(k=>[k,after[k]])),changed};}
