const SAFE_ID=/^[A-Za-z0-9_-]{1,128}$/;
export function assertSafeId(value:string,name='id'):string { if(!SAFE_ID.test(value))throw new RangeError(`${name} has invalid format`);return value; }
