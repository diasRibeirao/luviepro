export const DEFAULT_PO_DAILY_CENTS=30000;

export type ServiceTeamLike={dailyRateCents?:number|null;included?:boolean};
export type ServiceDailyLike<T extends ServiceTeamLike=ServiceTeamLike>={dailyRateCents?:number|null;team?:T[]|null};

export const activeServiceTeam=<T extends ServiceTeamLike>(service?:ServiceDailyLike<T>|null):T[]=>(service?.team??[]).filter(member=>member.included!==false);

export const serviceTeamDailyCents=<T extends ServiceTeamLike>(service?:ServiceDailyLike<T>|null)=>activeServiceTeam(service).reduce((sum,member)=>sum+Math.max(0,Number(member.dailyRateCents)||0),0);

export const serviceReferenceDailyCents=<T extends ServiceTeamLike>(service?:ServiceDailyLike<T>|null)=>{
  if(!service)return DEFAULT_PO_DAILY_CENTS;
  const teamDaily=serviceTeamDailyCents(service);
  if(teamDaily>0)return teamDaily;
  const baseDaily=Math.max(0,Number(service.dailyRateCents)||0);
  return baseDaily>0?baseDaily:DEFAULT_PO_DAILY_CENTS;
};
