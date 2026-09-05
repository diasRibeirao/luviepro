import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type {Request,Response} from 'express';
import { requestId } from './request-id';
import { errorCode } from './http/error-response';
import {safeErrorMessage} from './security/safe-error';

type ErrorBody={message?:string|string[];error?:string};
type RequestWithId=Request&{requestId?:string};
type InternalError=Error&{code?:unknown;meta?:unknown;clientVersion?:unknown};

function safeInternalLog(exception:unknown){
  if(!(exception instanceof Error))return {name:'UnknownError'};
  const error=exception as InternalError;
  return {
    name:error.name,
    message:error.message,
    ...(typeof error.code==='string'?{code:error.code}:{}),
    ...(error.meta&&typeof error.meta==='object'?{meta:error.meta}:{}),
    ...(typeof error.clientVersion==='string'?{clientVersion:error.clientVersion}:{}),
    stack:error.stack?.split('\n').slice(0,8).join('\n'),
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx=host.switchToHttp(),res=ctx.getResponse<Response>(),req=ctx.getRequest<RequestWithId>();
    const status=exception instanceof HttpException?exception.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
    const correlationId=req.requestId||requestId(req.headers['x-request-id']);

    // Mantém a resposta pública genérica em produção, mas registra a causa real
    // no log do servidor para permitir diagnóstico de erros 500.
    if(!(exception instanceof HttpException)){
      console.error(JSON.stringify({
        level:'error',
        event:'http_internal_error',
        requestId:correlationId,
        method:req.method,
        path:req.url,
        ...safeInternalLog(exception),
      }));
    }

    const rawBody=exception instanceof HttpException?exception.getResponse():undefined;
    const body:ErrorBody=typeof rawBody==='object'&&rawBody!==null?rawBody as ErrorBody:{};
    const raw=typeof rawBody==='string'?rawBody:body.message;
    const message=exception instanceof HttpException?(Array.isArray(raw)?raw.join('; '):raw??'Erro interno do servidor'):safeErrorMessage(exception);
    res.setHeader('x-request-id',correlationId);
    res.status(status).json({statusCode:status,code:errorCode(body.error,status===500?'INTERNAL_SERVER_ERROR':'HTTP_ERROR'),message,path:req.url,requestId:correlationId,timestamp:new Date().toISOString()});
  }
}
