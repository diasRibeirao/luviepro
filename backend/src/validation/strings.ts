export const normalizeEmail=(value:string)=>value.trim().toLowerCase();
export const normalizeOptionalText=(value:string|undefined|null)=>{const v=value?.trim();return v?v:undefined;};
export function requireNonBlank(value:string,name:string):string { const v=value.trim();if(!v)throw new RangeError(`${name} must not be blank`);return v; }
