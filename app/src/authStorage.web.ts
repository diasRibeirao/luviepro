const KEY='luviepro.auth.v2';
export async function readAuth(){try{return window.localStorage.getItem(KEY)}catch{return null}}
export async function writeAuth(value:string){try{window.localStorage.setItem(KEY,value)}catch{}}
export async function clearAuth(){try{window.localStorage.removeItem(KEY)}catch{}}
