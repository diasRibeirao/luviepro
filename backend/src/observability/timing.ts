export interface Timing { elapsedMs():number; }
export function startTiming(now:()=>number=Date.now):Timing { const start=now();return {elapsedMs:()=>Math.max(0,now()-start)}; }
