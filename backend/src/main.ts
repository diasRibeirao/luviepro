import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisService } from './redis.service';
import helmet from 'helmet';
import { validateRuntimeConfig } from './runtime-config';
import { requestId } from './request-id';
import type {NextFunction,Request,Response} from 'express';
type RequestWithId=Request&{requestId?:string};
async function bootstrap(){
  validateRuntimeConfig();
  const app=await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.use(helmet());
  app.setGlobalPrefix('api');
  const trustProxy=Number(process.env.TRUST_PROXY_HOPS??0);if(trustProxy>0)app.getHttpAdapter().getInstance().set('trust proxy',trustProxy);
  const allowedOrigins=(process.env.CORS_ORIGINS??'http://localhost:8081,http://localhost:19006,http://localhost:3000').split(',').map(v=>v.trim()).filter(Boolean);
  app.enableCors({origin:process.env.NODE_ENV==='production'?allowedOrigins:true,credentials:true});
  app.use((req:RequestWithId,res:Response,next:NextFunction)=>{
    const correlationId=requestId(req.headers['x-request-id']);req.requestId=correlationId;res.setHeader('x-request-id',correlationId);const started=process.hrtime.bigint();
    res.on('finish',()=>{if(process.env.NODE_ENV==='production'||process.env.HTTP_ACCESS_LOG==='true'){const durationMs=Number(process.hrtime.bigint()-started)/1_000_000;console.log(JSON.stringify({level:'info',event:'http_request',requestId:correlationId,method:req.method,path:String(req.originalUrl??req.url).split('?',1)[0],statusCode:res.statusCode,durationMs:Number(durationMs.toFixed(1)),ip:String(req.ip??req.socket?.remoteAddress??'unknown')}));}});
    next();
  });
  const redis=app.get(RedisService);
  app.use(async(req:RequestWithId,res:Response,next:NextFunction)=>{
    const path=String(req.originalUrl??req.url).split('?',1)[0];
    const rule=path==='/api/auth/login'?{limit:8,window:60}:path==='/api/auth/forgot-password'?{limit:5,window:900}:path==='/api/auth/register'?{limit:5,window:900}:path==='/api/billing/webhooks/mercado-pago'?{limit:300,window:60}:null;
    if(!rule)return next();
    const ip=String(req.ip??req.socket?.remoteAddress??'unknown');const result=await redis.consumeRateLimit(`rate:${path}:${ip}`,rule.limit,rule.window);
    res.setHeader('X-RateLimit-Limit',String(rule.limit));res.setHeader('X-RateLimit-Remaining',String(result.remaining));
    if(result.allowed)return next();
    res.setHeader('Retry-After',String(result.retryAfter));return res.status(429).json({statusCode:429,code:'Too Many Requests',message:'Muitas tentativas. Aguarde e tente novamente.',path,requestId:req.requestId,timestamp:new Date().toISOString()});
  });
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.useGlobalFilters(new HttpExceptionFilter());
  const port=Number(process.env.PORT ?? 3333);
  await app.listen(port,'0.0.0.0');
  console.log(`LuviePro API: http://0.0.0.0:${port}/api`);
}
bootstrap().catch(error=>{console.error('[BOOTSTRAP_ERROR]',error instanceof Error?error.message:error);process.exitCode=1;});
