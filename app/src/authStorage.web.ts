const KEY='luviepro.auth.v3';
const LEGACY_KEY='luviepro.auth.v2';
export async function readAuth(){try{const value=window.localStorage.getItem(KEY);window.localStorage.removeItem(LEGACY_KEY);return value}catch{return null}}
export async function writeAuth(value:string){try{window.localStorage.setItem(KEY,value);window.localStorage.removeItem(LEGACY_KEY)}catch{}}
export async function clearAuth(){try{window.localStorage.removeItem(KEY);window.localStorage.removeItem(LEGACY_KEY)}catch{}}
