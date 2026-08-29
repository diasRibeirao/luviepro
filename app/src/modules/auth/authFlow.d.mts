import type { AuthSessionResponse } from '../../api';

export type AuthRoute='/'|'/home'|'/platform';
export type LoginRequest=(email:string,password:string)=>Promise<AuthSessionResponse>;
export type EstablishSession=(session:AuthSessionResponse)=>void;
export type ConfirmLogout=()=>Promise<boolean>;
export type LogoutSession=()=>Promise<void>;
export type ReplaceRoute=(route:AuthRoute)=>void;

export function postLoginRoute(session:Pick<AuthSessionResponse,'platform'>):AuthRoute;
export function isPublicAuthRoute(path:string):boolean;
export function authGuardRedirect(authenticated:boolean,path:string,platform?:boolean):AuthRoute|undefined;
export function runLogin(email:string,password:string,request:LoginRequest,establish:EstablishSession):Promise<AuthRoute>;
export function runLogout(confirmLogout:ConfirmLogout,logout:LogoutSession,replace:ReplaceRoute):Promise<boolean>;
