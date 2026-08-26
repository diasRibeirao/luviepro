import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearAuth,readAuth,writeAuth } from './authStorage';
const configuredBase=process.env.EXPO_PUBLIC_API_URL;
const metroHost=Constants.expoConfig?.hostUri?.split(':')[0];
const base=Platform.OS!=='web'&&metroHost&&configuredBase?.includes('localhost')?`http://${metroHost}:3333/api`:(configuredBase??'http://localhost:3333/api');
let token='';
let refreshToken='';
let session:{id?:string;name:string;email:string;role?:string;plan:string}|undefined;
let refreshPromise:Promise<boolean>|undefined;
export class ApiError extends Error{constructor(message:string,public status:number,public requestId?:string,public code?:string){super(message);this.name='ApiError';}}
export function setToken(value:string){token=value;void persistAuth();}
export function setSession(value:{id?:string;name:string;email:string;role?:string;plan:string}){session=value;void persistAuth();}
export function getSession(){return session;}
export function setSessionPlan(plan:string){if(session){session={...session,plan};void persistAuth();}}
export function hasToken(){return !!token;}
async function persistAuth(){if(token&&refreshToken&&session)await writeAuth(JSON.stringify({token,refreshToken,session}));else await clearAuth();}
export function establishSession(value:{token:string;refreshToken:string;user:{id?:string;name:string;email:string;role?:string};tenant:{plan:string}}){token=value.token;refreshToken=value.refreshToken;session={id:value.user.id,name:value.user.name,email:value.user.email,role:value.user.role,plan:value.tenant.plan};void persistAuth();}
export async function restoreSession(){try{const raw=await readAuth();if(!raw)return false;const parsed=JSON.parse(raw);if(!parsed?.token||!parsed?.refreshToken||!parsed?.session)return false;token=parsed.token;refreshToken=parsed.refreshToken;session=parsed.session;return true;}catch{return false;}}
export function clearSession(){token='';refreshToken='';session=undefined;void clearAuth();}
async function parseError(res:Response){const body=await res.json().catch(()=>({message:'Erro de conexão'}));const message=Array.isArray(body?.message)?body.message.join('; '):(body?.message??`Erro HTTP ${res.status}`);return new ApiError(message,res.status,body?.requestId??res.headers.get('x-request-id')??undefined,body?.code);}
async function renew(){if(!refreshToken)return false;if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{try{const res=await fetch(`${base}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})});if(!res.ok){clearSession();return false;}establishSession(await res.json());return true;}catch{clearSession();return false;}finally{refreshPromise=undefined;}})();return refreshPromise;}
export async function logout(){try{if(token)await fetch(`${base}/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});}finally{clearSession();}}
export async function api(path:string,init:RequestInit={},retry=true){
  let res:Response;
  try{res=await fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...init.headers}});}catch{throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(res.status===401&&retry&&!path.startsWith('/auth/')&&await renew())return api(path,init,false);
  if(res.status===401)clearSession();
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined:res.json();
}
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);

export async function apiForm(path:string,form:FormData,retry=true){
  let res:Response;
  try{res=await fetch(`${base}${path}`,{method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},body:form});}catch{throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(res.status===401&&retry&&await renew())return apiForm(path,form,false);
  if(res.status===401)clearSession();
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined:res.json();
}

export async function publicApi(path:string,init:RequestInit={}){
  let res:Response;
  try{res=await fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...init.headers}});}catch{throw new ApiError('Não foi possível conectar ao servidor',0);}
  if(!res.ok)throw await parseError(res);
  return res.status===204?undefined:res.json();
}
