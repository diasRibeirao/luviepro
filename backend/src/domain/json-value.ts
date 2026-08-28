export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue; }

export type JsonSafeInput = JsonPrimitive | Date | JsonSafeObject | readonly JsonSafeInput[] | undefined;
export interface JsonSafeObject { readonly [key: string]: JsonSafeInput; }

export function toJsonValue(value: JsonSafeInput): JsonValue {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(item => toJsonValue(item));
  if (value && typeof value === 'object') {
    const result: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result[key] = toJsonValue(item);
    }
    return result;
  }
  return value as JsonPrimitive;
}
