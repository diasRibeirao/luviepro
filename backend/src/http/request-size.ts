export function parseContentLength(value:string|undefined):number|undefined { if(value===undefined)return undefined; if(!/^\d+$/.test(value))return undefined; const n=Number(value);return Number.isSafeInteger(n)?n:undefined; }
export function exceedsContentLength(value:string|undefined,maxBytes:number):boolean { const n=parseContentLength(value);return n!==undefined&&n>maxBytes; }
