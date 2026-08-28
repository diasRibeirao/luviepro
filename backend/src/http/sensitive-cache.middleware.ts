import type {NextFunction,Request,Response} from 'express';
const PRIVATE_PREFIXES=['/api/auth','/api/account','/api/billing','/api/platform','/api/audit'];
export function sensitiveCacheMiddleware(){return (req:Request,res:Response,next:NextFunction)=>{if(PRIVATE_PREFIXES.some(prefix=>req.path===prefix||req.path.startsWith(`${prefix}/`))){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Pragma','no-cache');}next();};}
