const TRANSIENT=new Set([408,425,429,500,502,503,504]);
export function shouldRetryHttp(status:number){return TRANSIENT.has(status);}
export function retryAfterMs(value:string|null|undefined,now=Date.now()){if(!value)return 0;const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>=0)return Math.min(seconds*1000,30000);const date=Date.parse(value);return Number.isNaN(date)?0:Math.max(0,Math.min(date-now,30000));}
export function backoffMs(attempt:number){return Math.min(250*Math.pow(2,Math.max(0,attempt)),4000);}
