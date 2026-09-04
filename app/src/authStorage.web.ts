const KEY='luviepro.auth.v4';
const LEGACY_KEYS=['luviepro.auth.v3','luviepro.auth.v2'];

function cleanupLegacy(){
  for(const key of LEGACY_KEYS)window.localStorage.removeItem(key);
}

export async function readAuth(){
  try{
    cleanupLegacy();
    return window.sessionStorage.getItem(KEY);
  }catch{return null}
}

export async function writeAuth(value:string){
  try{
    window.sessionStorage.setItem(KEY,value);
    cleanupLegacy();
  }catch{}
}

export async function clearAuth(){
  try{
    window.sessionStorage.removeItem(KEY);
    cleanupLegacy();
  }catch{}
}
