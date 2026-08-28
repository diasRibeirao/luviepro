import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearAuth,readAuth,writeAuth } from './authStorage';
const configuredBase=process.env.EXPO_PUBLIC_API_URL;
const metroHost=Constants.expoConfig?.hostUri?.split(':')[0];
const webHost=Platform.OS==='web'&&typeof window!=='undefined'?window.location.hostname:undefined;
const development=typeof __DEV__!=='undefined'?__DEV__:process.env.NODE_ENV!=='production';
function apiBase(){
  const configured=configuredBase?.trim().replace(/\/$/,'');
  if(development&&configured?.includes('localhost')){
    if(Platform.OS!=='web'&&metroHost)return `http://${metroHost}:3333/api`;
    if(Platform.OS==='web'&&webHost)return `http://${webHost}:3333/api`;
  }
  if(configured){if(!development&&!configured.startsWith('https://'))throw new Error('EXPO_PUBLIC_API_URL deve utilizar HTTPS na build de produção');return configured;}
  if(Platform.OS==='web')return development&&webHost?`http://${webHost}:3333/api`:'/api';
  if(development&&metroHost)return `http://${metroHost}:3333/api`;
  throw new Error('EXPO_PUBLIC_API_URL não configurada para a build nativa de produção');
}
const base=apiBase();
const requestTimeoutMs=Math.max(5000,Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS??20000));
async function request(url:string,init:RequestInit={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),requestTimeoutMs);
  try{return await fetch(url,{...init,credentials:Platform.OS==='web'?'include':init.credentials,signal:controller.signal});}
  catch(error){if(controller.signal.aborted)throw new ApiError('O servidor demorou para responder. Tente novamente.',0);throw error;}
  finally{clearTimeout(timer);}
}
let token='';
let refreshToken='';
export type Session={id?:string;name:string;email:string;role?:string;plan:string;customProfileId?:string|null;customProfileName?:string|null;permissions?:string[]};
let session:Session|undefined;
let refreshPromise:Promise<boolean>|undefined;
export class ApiError extends Error{constructor(message:string,public status:number,public requestId?:string,public code?:string){super(message);this.name='ApiError';}}
export function setToken(value:string){token=value;void persistAuth();}
export function setSession(value:Session){session=value;void persistAuth();}
export function getSession(){return session;}
export function setSessionPlan(plan:string){if(session){session={...session,plan};void persistAuth();}}
export function hasToken(){return !!token;}
async function persistAuth(){if(session&&(Platform.OS==='web'||(token&&refreshToken))){const payload=Platform.OS==='web'?{session}:{token,refreshToken,session};await writeAuth(JSON.stringify(payload));}else await clearAuth();}
export type AuthSessionResponse={token:string;refreshToken?:string;platform?:boolean;user:{id?:string;name:string;email:string;role?:string;customProfileId?:string|null;customProfileName?:string|null;permissions?:string[]};tenant?:{plan:string}};
export function establishSession(value:AuthSessionResponse){token=value.token;if(Platform.OS!=='web')refreshToken=value.refreshToken??'';session={id:value.user.id,name:value.user.name,email:value.user.email,role:value.user.role,customProfileId:value.user.customProfileId,customProfileName:value.user.customProfileName,permissions:value.user.permissions??[],plan:value.tenant?.plan??(value.platform?'platform':'starter')};void persistAuth();}
export async function restoreSession(){try{const raw=await readAuth();if(Platform.OS==='web'){if(raw){const parsed=JSON.parse(raw);session=parsed?.session;}token='';refreshToken='';return renew();}if(!raw)return false;const parsed=JSON.parse(raw);if(!parsed?.session||!parsed?.token||!parsed?.refreshToken)return false;session=parsed.session;token=parsed.token;refreshToken=parsed.refreshToken;return true;}catch{clearSession();return false;}}
export function clearSession(){token='';refreshToken='';session=undefined;void clearAuth();}
async function parseError(res:Response){const body=await res.json().catch(()=>({message:'Erro de conexão'}));const message=Array.isArray(body?.message)?body.message.join('; '):(body?.message??`Erro HTTP ${res.status}`);return new ApiError(message,res.status,body?.requestId??res.headers.get('x-request-id')??undefined,body?.code);}
async function renew(){if(Platform.OS!=='web'&&!refreshToken)return false;if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{try{const web=Platform.OS==='web';const res=await request(`${base}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json',...(web?{'X-Auth-Client':'web'}:{})},body:JSON.stringify(web?{}:{refreshToken})});if(!res.ok){clearSession();return false;}establishSession(await res.json());return true;}catch{clearSession();return false;}finally{refreshPromise=undefined;}})();return refreshPromise;}
export async function logout(){try{if(token)await request(`${base}/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});}finally{clearSession();}}
export async function api<T=unknown>(path:string,init:RequestInit={},retry=true):Promise<T>{
  let res:Response;
  const webAuth=Platform.OS==='web'&&(path==='/auth/login'||path==='/auth/platform-login'||path==='/auth/register'||path.startsWith('/auth/invitations/'));
  try{res=await request(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...(webAuth?{'X-Auth-Client':'web'}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,...init.headers}});}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(res.status===401&&retry&&!path.startsWith('/auth/')&&await renew())return api<T>(path,init,false);
  if(res.status===401)clearSession();
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined as T:res.json() as Promise<T>;
}
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);

export async function apiForm<T=unknown>(path:string,form:FormData,retry=true):Promise<T>{
  let res:Response;
  try{res=await request(`${base}${path}`,{method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},body:form});}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(res.status===401&&retry&&await renew())return apiForm<T>(path,form,false);
  if(res.status===401)clearSession();
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined as T:res.json() as Promise<T>;
}

export async function publicApi<T=unknown>(path:string,init:RequestInit={}):Promise<T>{
  let res:Response;
  const webAuth=Platform.OS==='web'&&(['/auth/login','/auth/platform-login','/auth/register','/auth/refresh'].includes(path)||path.startsWith('/auth/invitations/'));
  try{res=await request(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...(webAuth?{'X-Auth-Client':'web'}:{}),...init.headers}});}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined as T:res.json() as Promise<T>;
}
