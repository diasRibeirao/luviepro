import { envInt } from './env';
export function invitationTtlHours(env:NodeJS.ProcessEnv=process.env):number{return envInt(env,'INVITATION_TTL_HOURS',48,{min:1,max:720});}
export function invitationExpiry(now=new Date(),env:NodeJS.ProcessEnv=process.env):Date{return new Date(now.getTime()+invitationTtlHours(env)*3_600_000);}
