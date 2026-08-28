const SAFE=/^[A-Za-z0-9_-]{8,160}$/;
export function isSafeExternalReference(value:string):boolean{return SAFE.test(value);}
export function buildExternalReference(prefix:string,tenantId:string,nonce:string):string{const value=`${prefix}_${tenantId}_${Date.now()}_${nonce}`;if(!isSafeExternalReference(value))throw new Error('Invalid external reference');return value;}
