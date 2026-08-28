import type { Prisma } from '../../../generated-prisma';
import { toJsonValue, type JsonSafeObject } from '../domain/json-value';
export type AuditMetadata = JsonSafeObject;
export function auditMetadata(value?: AuditMetadata): Prisma.InputJsonObject | undefined {
  if (!value) return undefined;
  return toJsonValue(value) as Prisma.InputJsonObject;
}
