export interface OkResult<T> { ok: true; data: T; }
export interface ErrorResult { ok: false; code: string; message: string; }
export type HttpResult<T> = OkResult<T> | ErrorResult;
export const okResult = <T>(data:T):OkResult<T> => ({ok:true,data});
export const errorResult = (code:string,message:string):ErrorResult => ({ok:false,code,message});
