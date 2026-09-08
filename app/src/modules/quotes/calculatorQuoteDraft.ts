export type CalculatorDraftLine={label:string;value:string};
export type CalculatorQuoteDraft={
  serviceIds:string[];
  days:string;
  margin:string;
  minimumDailyCents:number;
  team:CalculatorDraftLine[];
  variable:CalculatorDraftLine[];
  fixed:CalculatorDraftLine[];
};

type SessionStorageLike={
  getItem:(key:string)=>string|null;
  setItem:(key:string,value:string)=>void;
  removeItem:(key:string)=>void;
};

const STORAGE_KEY='luviepro.calculatorQuoteDraft.v1';
let current:CalculatorQuoteDraft|undefined;

function cloneDraft(draft:CalculatorQuoteDraft):CalculatorQuoteDraft{
  return {
    ...draft,
    serviceIds:[...draft.serviceIds],
    team:draft.team.map(line=>({...line})),
    variable:draft.variable.map(line=>({...line})),
    fixed:draft.fixed.map(line=>({...line})),
  };
}

function sessionStorageSafe():SessionStorageLike|undefined{
  try{
    return (globalThis as typeof globalThis&{sessionStorage?:SessionStorageLike}).sessionStorage;
  }catch{
    return undefined;
  }
}

function isDraft(value:unknown):value is CalculatorQuoteDraft{
  if(!value||typeof value!=='object')return false;
  const draft=value as Partial<CalculatorQuoteDraft>;
  return Array.isArray(draft.serviceIds)
    &&typeof draft.days==='string'
    &&typeof draft.margin==='string'
    &&typeof draft.minimumDailyCents==='number'
    &&Array.isArray(draft.team)
    &&Array.isArray(draft.variable)
    &&Array.isArray(draft.fixed);
}

export function setCalculatorQuoteDraft(draft:CalculatorQuoteDraft){
  current=cloneDraft(draft);
  try{sessionStorageSafe()?.setItem(STORAGE_KEY,JSON.stringify(current));}catch{/* storage unavailable/full: in-memory fallback remains */}
}

/**
 * Reads without consuming so React StrictMode/effect re-runs cannot erase the draft.
 * On web, sessionStorage also preserves the calculator context across a page reload.
 */
export function getCalculatorQuoteDraft():CalculatorQuoteDraft|undefined{
  if(current)return cloneDraft(current);
  try{
    const raw=sessionStorageSafe()?.getItem(STORAGE_KEY);
    if(!raw)return undefined;
    const parsed:unknown=JSON.parse(raw);
    if(!isDraft(parsed)){
      sessionStorageSafe()?.removeItem(STORAGE_KEY);
      return undefined;
    }
    current=cloneDraft(parsed);
    return cloneDraft(current);
  }catch{
    return undefined;
  }
}

export function clearCalculatorQuoteDraft(){
  current=undefined;
  try{sessionStorageSafe()?.removeItem(STORAGE_KEY);}catch{/* noop */}
}
