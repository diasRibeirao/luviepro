import Constants from 'expo-constants';
import { Platform } from 'react-native';
const configuredBase=process.env.EXPO_PUBLIC_API_URL;
const metroHost=Constants.expoConfig?.hostUri?.split(':')[0];
const base=Platform.OS!=='web'&&metroHost&&configuredBase?.includes('localhost')?`http://${metroHost}:3333/api`:(configuredBase??'http://localhost:3333/api');
let token='';
let session:{name:string;email:string;plan:string}|undefined;
export function setToken(value:string){token=value;}
export function setSession(value:{name:string;email:string;plan:string}){session=value;}
export function getSession(){return session;}
export function setSessionPlan(plan:string){if(session)session={...session,plan};}
export async function api(path:string,init:RequestInit={}){const res=await fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...init.headers}});if(!res.ok)throw new Error((await res.json().catch(()=>({message:'Erro de conexão'}))).message);return res.json();}
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
