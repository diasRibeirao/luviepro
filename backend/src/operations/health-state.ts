export type DependencyState='up'|'down';
export interface DependencyHealth { state:DependencyState; latencyMs:number; }
export function dependencyHealth(state:DependencyState,startedAt:number,endedAt=Date.now()):DependencyHealth{return {state,latencyMs:Math.max(0,endedAt-startedAt)}};
