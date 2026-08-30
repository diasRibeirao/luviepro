export type StageLike={duration?:string|null};

export function durationDays(value?:string|null):number{
  if(!value)return 0;
  const normalized=String(value).trim().replace(',','.');
  const match=normalized.match(/\d+(?:\.\d+)?/);
  if(!match)return 0;
  const amount=Number(match[0]);
  if(!Number.isFinite(amount)||amount<=0)return 0;
  if(/hora|horas|\bh\b/i.test(normalized))return amount/8;
  return amount;
}

export function projectDaysFromStages(stages?:StageLike[]|null,fallback=1):number{
  const total=(stages??[]).reduce((sum,stage)=>sum+durationDays(stage.duration),0);
  return total>0?Math.max(1,Math.ceil(total)):Math.max(1,Math.ceil(Number(fallback)||1));
}
