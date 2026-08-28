import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type {Request,Response} from 'express';
import { requestId } from './request-id';
import { errorCode } from './http/error-response';
type ErrorBody={message?:string|string[];error?:string};
type RequestWithId=Request&{requestId?:string};
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if(!(exception instanceof HttpException)&&process.env.NODE_ENV!=='production')console.error('[HTTP_ERROR]',exception);
    const ctx=host.switchToHttp(),res=ctx.getResponse<Response>(),req=ctx.getRequest<RequestWithId>();
    const status=exception instanceof HttpException?exception.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
    const rawBody=exception instanceof HttpException?exception.getResponse():undefined;
    const body:ErrorBody=typeof rawBody==='object'&&rawBody!==null?rawBody as ErrorBody:{};
    const raw=typeof rawBody==='string'?rawBody:body.message;
    const message=Array.isArray(raw)?raw.join('; '):raw??'Erro interno do servidor';
    const correlationId=req.requestId||requestId(req.headers['x-request-id']);
    res.setHeader('x-request-id',correlationId);
    res.status(status).json({statusCode:status,code:errorCode(body.error,status===500?'INTERNAL_SERVER_ERROR':'HTTP_ERROR'),message,path:req.url,requestId:correlationId,timestamp:new Date().toISOString()});
  }
}
