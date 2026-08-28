export function nullableTrimmed(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed=value.trim();
  return trimmed || null;
}
export function defined<T>(value:T|undefined,fallback:T):T{return value===undefined?fallback:value;}
export function clampInteger(value:number,min:number,max:number):number{return Math.min(max,Math.max(min,Math.trunc(value)));}
